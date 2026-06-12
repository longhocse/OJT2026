import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-surface-container-lowest border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <h2 className="text-2xl font-bold text-primary mb-4">MovieTap</h2>
            <p className="text-sm text-on-surface-variant">
              Experience cinema like never before. Book tickets, enjoy VIP perks, and get AI-powered recommendations.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">
                <Youtube size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><Link to="/movies" className="hover:text-primary transition-colors">Now Showing</Link></li>
              <li><Link to="/movies?status=coming_soon" className="hover:text-primary transition-colors">Coming Soon</Link></li>
              <li><Link to="/my-bookings" className="hover:text-primary transition-colors">My Bookings</Link></li>
              <li><Link to="/offers" className="hover:text-primary transition-colors">Offers</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li>Hotline: 1900 1234</li>
              <li>Email: support@movietap.com</li>
              <li>Address: 123 Cinema Street, District 1, HCMC</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-on-surface-variant">
          <p>&copy; {new Date().getFullYear()} MovieTap. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;