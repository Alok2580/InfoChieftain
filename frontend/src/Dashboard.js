import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './Dashboard.css';

const socket = io(process.env.REACT_APP_API_URL);

function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookingsRes = await axios.get(`${process.env.REACT_APP_API_URL}/api/chat/bookings`);
        setBookings(bookingsRes.data);
        const ordersRes = await axios.get(`${process.env.REACT_APP_API_URL}/api/chat/room-service`);
        setOrders(ordersRes.data);
      } catch (error) {
        console.error("Could not fetch initial data", error);
      }
    };
    
  

    fetchData();

    socket.on('new_booking', (newBooking) => {
      setBookings(prev => [newBooking, ...prev]);
    });

    socket.on('new_room_service', (newOrder) => {
      setOrders(prev => [newOrder, ...prev]);
    });

    socket.on('booking_status_updated', (updatedBooking) => {
      setBookings(prev => 
        prev.map(b => b._id === updatedBooking._id ? updatedBooking : b)
      );
    });

    socket.on('room_service_status_updated', (updatedOrder) => {
      setOrders(prev => 
        prev.map(o => o._id === updatedOrder._id ? updatedOrder : o)
      );
    });

    return () => {
      socket.off('new_booking');
      socket.off('new_room_service');
      socket.off('booking_status_updated');
      socket.off('room_service_status_updated');
    };
  }, []);

  const handleBookingStatusUpdate = async (id, status) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/api/chat/bookings/${id}`, { status });
    } catch (error) {
      console.error("Failed to update booking status", error);
      alert("Failed to update booking status.");
    }
  };

  const handleRoomServiceStatusUpdate = async (id, status) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/api/chat/room-service/${id}`, { status });
    } catch (error) {
      console.error("Failed to update room service status", error);
      alert("Failed to update room service status.");
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Staff Dashboard</h1>
        <p>Real-time Hotel Operations</p>
      </header>
      <main className="dashboard-main">
        <div className="dashboard-section">
          <h2>Booking Requests</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Request Details</th>
                  <th>Status</th>
                  <th>Received At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>{booking.details}</td>
                    <td><span className={`status status-${booking.status.toLowerCase()}`}>{booking.status}</span></td>
                    <td>{new Date(booking.createdAt).toLocaleString()}</td>
                    <td>
                      {booking.status === 'Pending' ? (
                        <div className="action-buttons">
                          <button onClick={() => handleBookingStatusUpdate(booking._id, 'Approved')} className="btn-approve">Approve</button>
                          <button onClick={() => handleBookingStatusUpdate(booking._id, 'Declined')} className="btn-decline">Decline</button>
                        </div>
                      ) : ( <span>-</span> )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Room Service Orders</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order Details</th>
                  <th>Status</th>
                  <th>Received At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>{order.details}</td>
                    <td><span className={`status status-${order.status.toLowerCase()}`}>{order.status}</span></td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>
                      {order.status === 'Pending' ? (
                        <div className="action-buttons">
                          <button onClick={() => handleRoomServiceStatusUpdate(order._id, 'Approved')} className="btn-approve">Approve</button>
                          <button onClick={() => handleRoomServiceStatusUpdate(order._id, 'Declined')} className="btn-decline">Decline</button>
                        </div>
                      ) : ( <span>-</span> )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
