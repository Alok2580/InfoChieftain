const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Booking = require('../models/booking');
const RoomService = require('../models/RoomService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const hotelMenu = `
- Pizza: $21
- Burger: $12
- Pasta: $14
- Salad: $10
- Coke: $3
- Water: $2
`;

router.post('/', async (req, res) => {
  try {
    const { message, history, socketId } = req.body;
    if (!socketId) {
        return res.status(400).json({ reply: "Error: Missing user session ID. Please refresh the page." });
    }
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const io = req.app.get('socketio');

    const intentPrompt = `
      You are an AI assistant responsible for routing user requests.
      Analyze ONLY the user's most recent message: "${message}"
      Our hotel menu is: ${hotelMenu}

      Determine the user's primary intent from their most recent message. Respond with ONLY one of the following keywords:
      - "BOOKING": If the user wants to book, reserve, or check in to a room.
      - "ROOM_SERVICE": If the user is clearly ordering one or more specific items of food or drink (e.g., "I want a pizza," "bring me a coke").
      - "SHOW_MENU": If the user is asking to see the menu, asking what food is available, or asking about prices.
      - "GENERAL_QUERY": For any other question (e.g., pool hours, Wi-Fi, recommendations).
    `;

    const intentResult = await model.generateContent(intentPrompt);
    const intent = (await intentResult.response).text().trim().replace(/"/g, "");

    let replyText;

    if (intent === 'BOOKING') {
      const newBooking = new Booking({ details: message, socketId: socketId });
      await newBooking.save();
      io.emit('new_booking', newBooking);
      replyText = "I've noted your booking request. Our staff will confirm the details with you shortly.";

    } else if (intent === 'ROOM_SERVICE') {
      const newOrder = new RoomService({ details: message, socketId: socketId });
      await newOrder.save();
      io.emit('new_room_service', newOrder);
      replyText = "Your room service order has been placed. Our staff is reviewing it and you will receive a confirmation shortly.";

    } else if (intent === 'SHOW_MENU') {
      replyText = `Of course! Here is our current room service menu:\n${hotelMenu}`;

    } else { // GENERAL_QUERY
      const formattedHistory = history.map(msg => 
        `${msg.sender === 'bot' ? 'AI Assistant' : 'User'}: ${msg.text}`
      ).join('\n');

      // --- FINAL, MORE FORCEFUL PROMPT ---
      const chatPrompt = `
        You are an AI Hotel Concierge. Your memory is the conversation history provided.
        This is the conversation history with a guest:
        ${formattedHistory}
        
        User: ${message}

        Your task is to respond to the User's last message.
        You MUST use the context from the history to provide a relevant and personalized response.
        Do not say you don't have information about previous orders. The history IS your memory.
        Respond directly to the user as the AI Assistant.
        AI Assistant:
      `;
      const chatResult = await model.generateContent(chatPrompt);
      replyText = (await chatResult.response).text();
    }

    res.json({ reply: replyText });

  } catch (error) {
    console.error("Error in chat route:", error);
    res.status(500).json({ reply: "An error occurred." });
  }
});

// ... other routes for PUT and GET are unchanged ...
router.put('/bookings/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ msg: 'Booking not found' });

        booking.status = status;
        await booking.save();

        const io = req.app.get('socketio');
        io.emit('booking_status_updated', booking);

        const userMessage = status === 'Approved' 
            ? 'Great news! Your booking request has been approved by our staff.'
            : 'We are sorry, but your booking request has been declined. Please contact the front desk for more information.';
        
        io.to(booking.socketId).emit('booking_response', { text: userMessage });
        res.json(booking);
    } catch (error) {
        console.error("Error updating booking:", error);
        res.status(500).send('Server Error');
    }
});

router.put('/room-service/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await RoomService.findById(req.params.id);
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        order.status = status;
        await order.save();

        const io = req.app.get('socketio');
        io.emit('room_service_status_updated', order);

        const userMessage = status === 'Approved' 
            ? 'Your room service order has been approved and is being prepared! It will be delivered in approximately 30 minutes.'
            : 'We apologize, but there was an issue with your room service order and it has been declined. Please contact the front desk.';
        
        io.to(order.socketId).emit('room_service_response', { text: userMessage });
        res.json(order);
    } catch (error) {
        console.error("Error updating room service order:", error);
        res.status(500).send('Server Error');
    }
});

router.get('/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

router.get('/room-service', async (req, res) => {
    try {
        const orders = await RoomService.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
