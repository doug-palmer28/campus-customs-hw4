import { Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import Cart from "./pages/Cart";
import Shipping from "./pages/Shipping";
import SizeGuide from "./pages/SizeGuide";
import Contact from "./pages/Contact";
import Account from "./pages/Account";
import Trivia from "./pages/Trivia";
import Bulldog from "./components/Bulldog";
import ScrollToTop from "./components/ScrollToTop";
import LandmarkBackdrop from "./components/LandmarkBackdrop";
import { PeekingDan } from "./components/DanExtras";
import { Link } from "react-router-dom";

export default function App() {
  return (
    <div className="app-shell">
      <ScrollToTop />
      <LandmarkBackdrop />
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/shipping" element={<Shipping />} />
          <Route path="/size-guide" element={<SizeGuide />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/account" element={<Account />} />
          <Route path="/trivia" element={<Trivia />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <PeekingDan />
      <ChatWidget />
    </div>
  );
}

function NotFound() {
  return (
    <section className="page empty-cart">
      <Bulldog size={150} />
      <h1>Page not found</h1>
      <p className="muted">
        Even Handsome Dan couldn't sniff out that page. Let's head back to the shop.
      </p>
      <Link to="/products" className="btn btn-primary">
        Browse products
      </Link>
    </section>
  );
}
