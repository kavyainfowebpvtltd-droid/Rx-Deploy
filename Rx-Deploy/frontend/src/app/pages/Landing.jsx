import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Shield, Clock, CheckCircle, Star, Users, Award, TrendingUp, Pill, FileText, Heart, CreditCard, Stethoscope } from "lucide-react";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";

export default function Landing() {
  const features = [
    {
      icon: Shield,
      title: "Secure & Confidential",
      description: "Your health data is protected with enterprise-grade encryption",
    },
    {
      icon: Clock,
      title: "24/7 Availability",
      description: "Access healthcare services anytime, anywhere",
    },
    {
      icon: CheckCircle,
      title: "Verified Professionals",
      description: "All doctors and pharmacists are certified and verified",
    },
  ];

  const stats = [
    { icon: Users, value: "50K+", label: "Happy Patients" },
    { icon: Award, value: "200+", label: "Expert Doctors" },
    { icon: TrendingUp, value: "98%", label: "Success Rate" },
    { icon: Star, value: "4.9", label: "Average Rating" },
  ];

  return (
    <>
      <Navbar hideAuth={true} hideMobileMenuButton={true} />

      <main className="flex-1">
        {/* Hero Section */}
        <motion.section
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#60A5FA] text-white overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <motion.div
                initial={false}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="min-w-0 space-y-5 sm:space-y-6"
              >
                <h1 className="text-4xl sm:text-5xl md:text-6xl leading-tight">
                  Welcome to <span className="block mt-2">RxIncredible</span>
                </h1>
                <p className="text-lg sm:text-xl text-blue-100">
                  Think Beyond Thought. Experience the future of healthcare with our comprehensive online pharmacy and prescription analysis .
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#1E3A8A] rounded-2xl hover:scale-105 transition-transform duration-200 shadow-xl"
                  >
                    Sign Up
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent border-2 border-white text-white rounded-2xl hover:bg-white/10 transition-all duration-200"
                  >
                    Login
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={false}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="hidden lg:block"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-white/10 rounded-3xl blur-3xl"></div>
                  <div className="relative space-y-4">
                    {/* Service Card 1 - Online Pharmacy */}
                    <div className="bg-white/90 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-xl flex items-center justify-center">
                          <Pill className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-[#1E3A8A] font-semibold">Online Pharmacy</p>
                          <p className="text-sm text-gray-600">Your Trusted pharmacy.</p>
                        </div>
                      </div>
                    </div>
                    {/* Service Card 2 - Prescription Analysis */}
                    <div className="bg-white/90 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#16A34A] to-[#22C55E] rounded-xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-[#1E3A8A] font-semibold">Prescription Analysis</p>
                          <p className="text-sm text-gray-600">Decode Your Prescription.</p>
                        </div>
                      </div>
                    </div>
                    {/* Service Card 3 - Doctor Consultations */}
                    <div className="bg-white/90 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#7C3AED] to-[#A855F7] rounded-xl flex items-center justify-center">
                          <Stethoscope className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-[#1E3A8A] font-semibold">Second Opinion</p>
                          <p className="text-sm text-gray-600">Expert Advice.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Stats Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-2xl mb-4">
                    <stat.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl text-[#1E3A8A] mb-2">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-[#F1F5F9]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-4">Why Choose RxIncredible?</h2>
              <p className="text-lg sm:text-xl text-gray-600">Experience healthcare like never before</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-2xl flex items-center justify-center mb-6">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl text-[#1E3A8A] mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

       
      </main>

      <Footer />
    </>
  );
}
