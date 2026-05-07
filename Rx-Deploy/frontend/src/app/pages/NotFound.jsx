import { Link } from "react-router";
import { motion } from "motion/react";
import { Home, ArrowLeft } from "lucide-react";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";

export default function NotFound() {
  return (
    <>
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="mb-8"
          >
            <h1 className="text-9xl bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#60A5FA] bg-clip-text text-transparent">
              404
            </h1>
          </motion.div>
          
          <h2 className="text-3xl text-[#1E3A8A] mb-4">Page Not Found</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
            Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200"
              >
                <Home className="w-5 h-5" />
                Go Home
              </Link>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                Go Back
              </button>
            </motion.div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}
