import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const UPI_ID = "yourupiid@bank"; // Replace with your real merchant UPI ID
const ADMIN_EMAIL = "admin@driveeasy.com";
const ADMIN_PASSWORD = "admin123";

const initialCars = [
  { id: 1, name: "Hyundai i20", type: "Petrol", category: "Hatchback", price: 1800, seats: 5, range: "—", image: "🚗", available: true },
  { id: 2, name: "Maruti Swift", type: "Petrol", category: "Hatchback", price: 1600, seats: 5, range: "—", image: "🚙", available: true },
  { id: 3, name: "Tata Nexon", type: "Diesel", category: "SUV", price: 2400, seats: 5, range: "—", image: "🚘", available: true },
  { id: 4, name: "Toyota Hyryder Hybrid", type: "Hybrid", category: "SUV", price: 3200, seats: 5, range: "Hybrid backup", image: "🚕", available: true },
  { id: 5, name: "Tata Nexon EV", type: "Electric", category: "Electric SUV", price: 2800, seats: 5, range: "Approx. 325 km*", image: "⚡", available: true },
  { id: 6, name: "MG Comet EV", type: "Electric", category: "Electric Compact", price: 1900, seats: 4, range: "Approx. 230 km*", image: "🔋", available: true }
];

const readStore = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};

export default function App() {
  const [cars, setCars] = useState(() => readStore("de_cars", initialCars));
  const [bookings, setBookings] = useState(() => readStore("de_bookings", []));
  const [user, setUser] = useState(() => readStore("de_user", null));
  const [page, setPage] = useState("home");
  const [filter, setFilter] = useState("All");
  const [selectedCar, setSelectedCar] = useState(null);
  const [days, setDays] = useState(1);
  const [payment, setPayment] = useState("UPI");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickup, setPickup] = useState("");
  const [notice, setNotice] = useState("");
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [vehicleLocation, setVehicleLocation] = useState({ lat: 16.5062, lng: 80.6480 });
  const [fuel, setFuel] = useState(35);
  const [sosStatus, setSosStatus] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState(["DriveEasy assistant: Hi! Ask me about cars, booking, payment or support."]);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => localStorage.setItem("de_cars", JSON.stringify(cars)), [cars]);
  useEffect(() => localStorage.setItem("de_bookings", JSON.stringify(bookings)), [bookings]);
  useEffect(() => localStorage.setItem("de_user", JSON.stringify(user)), [user]);

  const total = selectedCar ? selectedCar.price * Math.max(1, Number(days) || 1) : 0;
  const filteredCars = useMemo(() => cars.filter(c => c.available && (filter === "All" || c.type === filter)), [cars, filter]);
  const myBookings = bookings.filter(b => user?.role === "admin" || b.email === user?.email);
  const upiLink = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=DriveEasy&am=${total}&cu=INR&tn=${encodeURIComponent("Car rental booking")}`;

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  function signIn(e) {
    e.preventDefault();
    if (loginEmail === ADMIN_EMAIL && loginPassword === ADMIN_PASSWORD) {
      setUser({ name: "Administrator", email: ADMIN_EMAIL, role: "admin" });
      setPage("admin");
      flash("Logged in as demo administrator.");
      return;
    }
    if (!loginEmail.includes("@") || loginPassword.length < 4) {
      flash("Enter a valid email and password (minimum 4 characters).");
      return;
    }
    setUser({ name: loginEmail.split("@")[0], email: loginEmail, role: "customer" });
    setPage("home");
    flash("Login successful.");
  }

  function bookCar(e) {
    e.preventDefault();
    if (!user) { flash("Please login before booking."); setPage("login"); return; }
    if (!selectedCar || !pickup.trim() || !customerName.trim() || !customerPhone.trim()) {
      flash("Please fill in your name, phone number and pickup location.");
      return;
    }
    const booking = {
      id: `DE${Date.now().toString().slice(-7)}`,
      carId: selectedCar.id, car: selectedCar.name, type: selectedCar.type,
      name: customerName, email: user.email, phone: customerPhone, pickup,
      days: Math.max(1, Number(days) || 1), amount: total, payment,
      status: "Confirmed (demo)", paymentStatus: payment === "Cash on Pickup" ? "Pay at pickup" : "Awaiting verification",
      date: new Date().toLocaleString()
    };
    setBookings(old => [booking, ...old]);
    setSelectedCar(null);
    setPage("dashboard");
    flash(`Booking ${booking.id} created. ${payment === "Cash on Pickup" ? "Pay at pickup." : "Payment is awaiting verification."}`);
  }

  function locateDevice() {
    if (!navigator.geolocation) { flash("Geolocation is not supported by this browser."); return; }
    navigator.geolocation.getCurrentPosition(
      pos => setDeviceLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => flash("Location permission denied or unavailable. Allow location access and try again."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function moveDemoVehicle() {
    setVehicleLocation(old => ({ lat: old.lat + 0.0008, lng: old.lng + 0.0006 }));
    flash("Demo vehicle coordinates updated.");
  }

  function sendSOS() {
    if (!deviceLocation) {
      setSosStatus("Get your device location first. SOS message has not been sent.");
      return;
    }
    const msg = `Emergency! I need assistance. My phone location: https://www.google.com/maps?q=${deviceLocation.lat},${deviceLocation.lng}`;
    setSosStatus("Emergency message prepared. Choose a contact in your device share menu.");
    if (navigator.share) navigator.share({ title: "DriveEasy Emergency", text: msg }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function sendChat() {
    const q = chatInput.trim();
    if (!q) return;
    let answer = "Please contact DriveEasy support for assistance. This is a basic demo chatbot.";
    const s = q.toLowerCase();
    if (s.includes("price") || s.includes("cost")) answer = "Rental prices are shown on each car card and are charged per day.";
    else if (s.includes("book")) answer = "Login, choose an available car, select rental days, enter pickup details and choose a payment method.";
    else if (s.includes("payment") || s.includes("upi")) answer = "You can select UPI QR, card (demo), or cash on pickup during booking.";
    else if (s.includes("electric") || s.includes("ev")) answer = "Use the Electric filter to view EVs. Charging-station directions are available in the EV section.";
    else if (s.includes("gps") || s.includes("location")) answer = "GPS Tracking shows demo vehicle coordinates. Real vehicle tracking needs a GPS device installed in the car.";
    setChat(old => [...old, `You: ${q}`, `DriveEasy assistant: ${answer}`]);
    setChatInput("");
  }

  function updateBookingStatus(id, status) {
    setBookings(old => old.map(b => b.id === id ? { ...b, status } : b));
  }

  function deleteCar(id) {
    setCars(old => old.map(c => c.id === id ? { ...c, available: false } : c));
  }

  function addCar() {
    const name = prompt("Enter car name:");
    if (!name?.trim()) return;
    const price = Number(prompt("Enter daily rental price in ₹:", "2000"));
    if (!Number.isFinite(price) || price <= 0) { flash("Enter a valid price."); return; }
    const type = prompt("Enter fuel type: Petrol, Diesel, Electric or Hybrid", "Electric") || "Electric";
    setCars(old => [...old, { id: Date.now(), name: name.trim(), type, category: "New listing", price, seats: 5, range: "—", image: "🚗", available: true }]);
    flash("Car added.");
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setPage("home")}><span className="brand-icon">D</span> DriveEasy</button>
        <nav>
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("cars")}>Cars</button>
          <button onClick={() => setPage("tracking")}>GPS & SOS</button>
          <button onClick={() => setPage("ev")}>EV Stations</button>
          {user && <button onClick={() => setPage("dashboard")}>My Bookings</button>}
          {user?.role === "admin" && <button onClick={() => setPage("admin")}>Admin</button>}
        </nav>
        <div className="account">
          {user ? <><span className="welcome">Hi, {user.name}</span><button className="outline small" onClick={() => { setUser(null); setPage("home"); }}>Logout</button></> :
            <button className="primary small" onClick={() => setPage("login")}>Login / Sign up</button>}
        </div>
      </header>

      {notice && <div className="toast">{notice}</div>}

      <main>
        {page === "home" && <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">SMART • SAFE • SIMPLE</span>
            <h1>Your journey.<br /><em>Your choice.</em></h1>
            <p>Book petrol, diesel, hybrid and electric cars with convenient digital booking, location tools and emergency support.</p>
            <div className="hero-actions"><button className="primary" onClick={() => setPage("cars")}>Explore cars →</button><button className="outline" onClick={() => setPage("tracking")}>GPS & Emergency</button></div>
            <div className="stats"><div><b>{cars.filter(c => c.available).length}+</b><span>Cars listed</span></div><div><b>4</b><span>Fuel choices</span></div><div><b>24/7</b><span>Demo support</span></div></div>
          </div>
          <div className="hero-art"><div className="sun"></div><div className="hero-car">🚙</div><div className="floating-card"><span>⚡</span><div><b>EV & Hybrid options</b><small>More ways to travel</small></div></div></div>
        </section>}

        {page === "home" && <section className="section">
          <div className="section-heading"><div><span className="eyebrow">WHY DRIVE EASY</span><h2>Everything for your trip</h2></div><button className="text-button" onClick={() => setPage("cars")}>View all cars →</button></div>
          <div className="feature-grid">
            <Feature icon="🚘" title="Multiple car types" desc="Choose petrol, diesel, electric or hybrid vehicles." />
            <Feature icon="📍" title="Location tools" desc="View demo vehicle tracking and your phone location." />
            <Feature icon="🆘" title="Emergency SOS" desc="Prepare an emergency message with your location." />
            <Feature icon="💳" title="Flexible payment" desc="UPI QR, card demo or cash on pickup." />
          </div>
        </section>}

        {page === "cars" && <section className="section page-section">
          <span className="eyebrow">OUR FLEET</span><h2>Choose your car</h2><p className="muted">Select a vehicle and book it for your trip.</p>
          <div className="filters">{["All", "Petrol", "Diesel", "Hybrid", "Electric"].map(f => <button key={f} className={filter === f ? "filter active" : "filter"} onClick={() => setFilter(f)}>{f}</button>)}</div>
          <div className="car-grid">{filteredCars.map(car => <article className="car-card" key={car.id}>
            <div className="car-image"><span>{car.image}</span><label>{car.type}</label></div>
            <div className="car-info"><div className="car-category">{car.category}</div><h3>{car.name}</h3><div className="car-meta"><span>👥 {car.seats} seats</span><span>⛽ {car.range}</span></div>
              <div className="car-bottom"><div><b>₹{car.price.toLocaleString("en-IN")}</b><small>/ day</small></div><button className="primary small" onClick={() => { setSelectedCar(car); setDays(1); setPage("booking"); }}>Book now</button></div>
            </div></article>)}</div>
          {filteredCars.length === 0 && <div className="empty">No cars available in this category.</div>}
          <p className="tiny-note">*EV range is illustrative. Check the vehicle manufacturer's current specifications before travel.</p>
        </section>}

        {page === "booking" && <section className="section page-section narrow">
          <span className="eyebrow">RESERVE YOUR RIDE</span><h2>Complete your booking</h2>
          {selectedCar ? <form className="panel form-grid" onSubmit={bookCar}>
            <div className="selected-car"><span>{selectedCar.image}</span><div><b>{selectedCar.name}</b><small>{selectedCar.type} • ₹{selectedCar.price.toLocaleString("en-IN")} / day</small></div></div>
            <label>Full name<input required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Your name" /></label>
            <label>Phone number<input required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="10-digit mobile number" /></label>
            <label>Pickup location<input required value={pickup} onChange={e => setPickup(e.target.value)} placeholder="Enter pickup address" /></label>
            <label>Rental days<input type="number" min="1" max="30" value={days} onChange={e => setDays(e.target.value)} /></label>
            <div className="total-line"><span>Total rental amount</span><b>₹{total.toLocaleString("en-IN")}</b></div>
            <div className="payment-options"><b>Choose payment method</b>{["UPI", "Card (Demo)", "Cash on Pickup"].map(p => <label className="radio-option" key={p}><input type="radio" name="payment" checked={payment === p} onChange={() => setPayment(p)} />{p}</label>)}</div>
            {payment === "UPI" && <div className="qr-panel"><div><b>Scan to pay ₹{total.toLocaleString("en-IN")}</b><p className="tiny-note">UPI ID: {UPI_ID}</p><p className="tiny-note">Replace the placeholder UPI ID in src/App.jsx before demonstrating.</p><a className="primary inline-button" href={upiLink}>Open UPI app</a></div><QRCodeSVG value={upiLink} size={142} /></div>}
            {payment === "Card (Demo)" && <p className="notice-box">Card payment is a UI demonstration only. No card details are collected and no real transaction is processed.</p>}
            {payment === "Cash on Pickup" && <p className="notice-box">Pay the rental amount at the pickup location.</p>}
            <button className="primary full" type="submit">Confirm booking</button>
            {!user && <p className="tiny-note">You must login before a booking can be saved.</p>}
          </form> : <div className="empty">No car selected. <button className="text-button" onClick={() => setPage("cars")}>Browse cars</button></div>}
        </section>}

        {page === "login" && <section className="section page-section narrow"><span className="eyebrow">YOUR ACCOUNT</span><h2>Login / Sign up</h2>
          <form className="panel form-grid" onSubmit={signIn}><label>Email address<input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Minimum 4 characters" /></label><button className="primary full">Continue</button><p className="tiny-note">Demo admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}. Customer sign-up is a local demo; use any valid email and password of 4+ characters.</p></form>
        </section>}

        {page === "dashboard" && <section className="section page-section"><span className="eyebrow">ACCOUNT</span><h2>My bookings</h2>
          {!user ? <div className="empty">Please <button className="text-button" onClick={() => setPage("login")}>login</button> to view bookings.</div> : myBookings.length === 0 ? <div className="empty">No bookings yet. <button className="text-button" onClick={() => setPage("cars")}>Book a car</button></div> :
          <div className="table-wrap"><table><thead><tr><th>Booking ID</th><th>Car</th><th>Pickup</th><th>Days</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead><tbody>{myBookings.map(b => <tr key={b.id}><td>{b.id}</td><td>{b.car}</td><td>{b.pickup}</td><td>{b.days}</td><td>₹{b.amount.toLocaleString("en-IN")}</td><td>{b.paymentStatus}</td><td><span className="status">{b.status}</span></td></tr>)}</tbody></table></div>}
        </section>}

        {page === "tracking" && <section className="section page-section"><span className="eyebrow">SAFETY CENTER</span><h2>GPS tracking & emergency</h2><p className="muted">This project demonstrates location features. A real vehicle tracker needs GPS hardware installed in the car and a backend connection.</p>
          <div className="two-col">
            <div className="panel"><div className="panel-icon">🚗</div><h3>Vehicle GPS tracker (demo)</h3><p className="muted">Simulated vehicle coordinates for demonstration. These are not live coordinates from a real car.</p><div className="coordinate"><span>Latitude</span><b>{vehicleLocation.lat.toFixed(5)}</b></div><div className="coordinate"><span>Longitude</span><b>{vehicleLocation.lng.toFixed(5)}</b></div><button className="primary full" onClick={moveDemoVehicle}>Update demo vehicle location</button><a className="map-link" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${vehicleLocation.lat},${vehicleLocation.lng}`}>Open vehicle position in Google Maps ↗</a></div>
            <div className="panel"><div className="panel-icon">📱</div><h3>Customer phone location</h3><p className="muted">Get the location of this phone/browser with your permission.</p>{deviceLocation ? <><div className="coordinate"><span>Latitude</span><b>{deviceLocation.lat.toFixed(5)}</b></div><div className="coordinate"><span>Longitude</span><b>{deviceLocation.lng.toFixed(5)}</b></div><a className="map-link" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${deviceLocation.lat},${deviceLocation.lng}`}>Open my location in Google Maps ↗</a></> : <button className="outline full" onClick={locateDevice}>Get my phone location</button>}</div>
          </div>
          <div className="panel sos-panel"><div><span className="eyebrow">EMERGENCY ASSISTANCE</span><h3>Need urgent help?</h3><p className="muted">Get your phone location, then prepare an SOS message to share with a trusted contact.</p>{sosStatus && <p className="notice-box">{sosStatus}</p>}</div><button className="danger" onClick={sendSOS}>🆘 Prepare SOS message</button><a className="call-link" href="tel:112">Call emergency number 112 (India)</a></div>
        </section>}

        {page === "ev" && <section className="section page-section"><span className="eyebrow">ELECTRIC MOBILITY</span><h2>EV charging station finder</h2><p className="muted">Use your current location to find nearby public EV charging stations in Google Maps.</p><div className="panel ev-panel"><div className="panel-icon">⚡</div><h3>Find charging stations nearby</h3><p className="muted">Allow location access, then open a Google Maps search for EV charging points.</p><button className="primary" onClick={() => { if (!navigator.geolocation) { flash("Geolocation is not supported."); return; } navigator.geolocation.getCurrentPosition(pos => { const url = `https://www.google.com/maps/search/EV+charging+stations/@${pos.coords.latitude},${pos.coords.longitude},14z`; window.open(url, "_blank"); }, () => flash("Allow location permission to find nearby charging stations.")); }}>Use my location & find stations</button></div></section>}

        {page === "admin" && <section className="section page-section"><span className="eyebrow">CONTROL PANEL</span><h2>Admin dashboard</h2>{user?.role !== "admin" ? <div className="empty">Admin login required.</div> : <>
          <div className="admin-stats"><Stat label="Total cars" value={cars.length} /><Stat label="Available cars" value={cars.filter(c => c.available).length} /><Stat label="Bookings" value={bookings.length} /><Stat label="Booking value" value={`₹${bookings.reduce((s,b) => s + b.amount,0).toLocaleString("en-IN")}`} /></div>
          <div className="section-heading admin-heading"><h3>Fleet management</h3><button className="primary small" onClick={addCar}>+ Add car</button></div>
          <div className="table-wrap"><table><thead><tr><th>Car</th><th>Fuel type</th><th>Price/day</th><th>Availability</th><th>Action</th></tr></thead><tbody>{cars.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.type}</td><td>₹{c.price}</td><td>{c.available ? "Available" : "Hidden"}</td><td>{c.available && <button className="danger small" onClick={() => deleteCar(c.id)}>Remove</button>}</td></tr>)}</tbody></table></div>
          <h3 className="subheading">All bookings</h3><div className="table-wrap"><table><thead><tr><th>ID</th><th>Customer</th><th>Car</th><th>Amount</th><th>Payment</th><th>Status</th><th>Update</th></tr></thead><tbody>{bookings.map(b => <tr key={b.id}><td>{b.id}</td><td>{b.name}<small className="table-sub">{b.email}</small></td><td>{b.car}</td><td>₹{b.amount}</td><td>{b.paymentStatus}</td><td>{b.status}</td><td><select value={b.status} onChange={e => updateBookingStatus(b.id,e.target.value)}><option>Confirmed (demo)</option><option>Vehicle handed over</option><option>Completed</option><option>Cancelled</option></select></td></tr>)}</tbody></table></div>
        </>}</section>}

        <section className="section support-section">
          <div><span className="eyebrow">NEED A HAND?</span><h2>DriveEasy support</h2><p className="muted">Ask the demo assistant a question.</p></div>
          <div className="chatbox"><div className="chat-messages">{chat.map((m,i)=><p key={i} className={m.startsWith("You:") ? "chat-user" : "chat-bot"}>{m}</p>)}</div><div className="chat-input"><input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Ask about booking, payment, GPS..." /><button className="primary" onClick={sendChat}>Send</button></div></div>
        </section>
      </main>
      <footer><b>DriveEasy</b><span>Car Rental System • React project demo</span><span>© {new Date().getFullYear()} DriveEasy</span></footer>
    </div>
  );
}

function Feature({icon,title,desc}) { return <div className="feature-card"><span>{icon}</span><h3>{title}</h3><p>{desc}</p></div>; }
function Stat({label,value}) { return <div className="stat-card"><span>{label}</span><b>{value}</b></div>; }
