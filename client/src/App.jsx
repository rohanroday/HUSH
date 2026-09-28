import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ProductsProvider } from "./context/ProductsContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollReveal from "./components/Reveal";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import SellerDashboard from "./pages/SellerDashboard";
import About from "./pages/About";
import Contact from "./pages/Contact";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProductsProvider>
          <CartProvider>
            <div className="flex min-h-dvh flex-col bg-cream">
              <ScrollReveal />
              <Navbar />
              <main id="main" className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/seller" element={<SellerDashboard />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </CartProvider>
        </ProductsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex max-w-360 flex-col items-start px-4 py-24 sm:px-6 lg:px-10 lg:py-36">
      <p className="font-display text-[clamp(7rem,26vw,20rem)] font-black leading-[0.8] text-ink">404</p>
      <h1 className="mt-6 text-2xl font-semibold text-ink">This page has gone quiet.</h1>
      <p className="mt-2 max-w-md text-sm text-stone">
        The link may be old or the piece may have sold through. The rest of the collection is still here.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/shop" className="btn btn-primary">
          Shop the collection
        </Link>
        <Link to="/" className="btn btn-outline">
          Back home
        </Link>
      </div>
    </div>
  );
}
