import { Database, Lock, Shield, UserCheck } from "lucide-react";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";

export default function PrivacyPolicy() {
  return (
    <>
      <Navbar hideAuth={true} hideMobileMenuButton={true} />

      <main className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <section className="bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#2563EB] text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4 mb-6">
              <Shield className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 mt-1" />
              <h1 className="min-w-0 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">Privacy Policy</h1>
            </div>
            <p className="text-lg sm:text-xl text-blue-100 max-w-2xl">
              This page explains how RxIncredible collects, uses, stores, and
              protects your personal and health-related information.
            </p>
            <p className="text-blue-200 mt-4">Last Updated: April 3, 2026</p>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 md:p-12 space-y-10">
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  1. Information We Collect
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                We may collect information you provide directly to us, including
                your name, email address, phone number, shipping details,
                account credentials, prescriptions, uploaded medical documents,
                and order details.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We may also collect technical information such as device type,
                browser information, IP address, and activity logs needed to
                secure and improve the platform.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <UserCheck className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  2. How We Use Your Information
                </h2>
              </div>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>To create and manage your account</li>
                <li>To verify your identity and process OTP-based flows</li>
                <li>To analyze prescriptions and provide healthcare services</li>
                <li>To fulfill orders, billing, shipping, and customer support</li>
                <li>To improve system security, reliability, and performance</li>
                <li>To comply with legal, regulatory, and healthcare obligations</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  3. Data Protection and Security
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use reasonable administrative, technical, and operational
                safeguards to protect your information from unauthorized access,
                misuse, alteration, or disclosure.
              </p>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-gray-700 leading-relaxed">
                  Sensitive health-related information is handled with elevated
                  care and only used for legitimate service delivery, support,
                  or compliance purposes.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  4. Sharing of Information
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                We do not sell your personal information. We may share limited
                information with authorized healthcare professionals, service
                providers, payment processors, delivery partners, and legal
                authorities where required.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Any such sharing is limited to what is reasonably necessary to
                operate the service or comply with applicable law.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  5. Data Retention
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                We retain personal and transaction data for as long as needed to
                provide services, maintain required records, resolve disputes,
                enforce agreements, and satisfy legal or medical compliance
                obligations.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <UserCheck className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  6. Your Choices and Rights
                </h2>
              </div>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>You can update certain account details from your profile</li>
                <li>You may request account-related support through our contact channels</li>
                <li>You may contact us with questions about how your data is handled</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  7. Contact Us
                </h2>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-gray-700">
                <p>
                  <strong>Email:</strong>{" "}
                  <a href="mailto:info@rxincredible.com">info@rxincredible.com</a>
                </p>
                <p>
                  <strong>Phone:</strong> <a href="tel:9822848689">9822848689</a>
                </p>
                <p>
                  <strong>Address:</strong> 234 Shree Nagar, Nagpur-15,
                  Maharashtra, India
                </p>
              </div>
            </section>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
