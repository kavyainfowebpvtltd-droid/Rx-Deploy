import {
  Scale,
  Shield,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";

export default function TermsAndConditions() {
  return (
    <>
      <Navbar hideAuth={true} />

      <main className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#60A5FA] text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4 mb-6">
              <Scale className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 mt-1" />
              <h1 className="min-w-0 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                Terms and Conditions
              </h1>
            </div>
            <p className="text-lg sm:text-xl text-blue-100 max-w-2xl">
              Please read these terms and conditions carefully before using
              RxIncredible services.
            </p>
            <p className="text-blue-200 mt-4">Last Updated: April 1, 2026</p>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 md:p-12">
            {/* Acceptance of Terms */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  1. Acceptance of Terms
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                By accessing and using RxIncredible's services, you accept and
                agree to be bound by the terms and provision of this agreement.
                Additionally, when using RxIncredible's services, you shall be
                subject to any posted guidelines or rules applicable to such
                services.
              </p>
            </div>

            {/* Description of Service */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  2. Description of Service
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                RxIncredible provides users with access to a rich collection of
                resources, including various communications tools, forums,
                shopping services, personalized content, and branded programming
                through its network of properties. You also understand and agree
                that the service may include advertisements and that these
                advertisements are necessary for RxIncredible to provide the
                service.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Our services include prescription analysis, online pharmacy
                consultations, second opinion services, and 24/7 healthcare
                support. All services are provided by verified healthcare
                professionals.
              </p>
            </div>

            {/* User Registration */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  3. User Registration and Account
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree to provide accurate and complete registration
                information and to update such information as necessary to keep
                it accurate and complete. RxIncredible reserves the right to
                suspend or terminate your account if any information provided is
                inaccurate or incomplete.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>You must be at least 18 years of age to register</li>
                <li>
                  You are responsible for maintaining the confidentiality of
                  your account
                </li>
                <li>
                  You agree to notify us immediately of any unauthorized use of
                  your account
                </li>
                <li>
                  You are solely responsible for all activities under your
                  account
                </li>
              </ul>
            </div>

            {/* Privacy Policy */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  4. Privacy Policy
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                Registration data and certain other information about you is
                subject to our Privacy Policy. You understand that through your
                use of the Service, you consent to the collection and use of
                this information, including the transfer of this information to
                other countries for storage, processing, and use.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We are committed to protecting your personal health information
                in compliance with applicable healthcare privacy laws and
                regulations, including HIPAA where applicable.
              </p>
            </div>

            {/* User Conduct */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  5. User Conduct
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>
                  Upload, post, email, transmit, or otherwise make available any
                  content that is unlawful, harmful, threatening, abusive,
                  harassing, tortious, defamatory, vulgar, obscene, libelous,
                  invasive of another's privacy, hateful, or racially,
                  ethnically, or otherwise objectionable
                </li>
                <li>Harm minors in any way</li>
                <li>
                  Impersonate any person or entity, including, but not limited
                  to, a RxIncredible official, forum leader, guide, or host, or
                  falsely state or otherwise misrepresent your affiliation with
                  a person or entity
                </li>
                <li>
                  Forge headers or otherwise manipulate identifiers in order to
                  disguise the origin of any content transmitted through the
                  Service
                </li>
                <li>
                  Upload, post, email, transmit, or otherwise make available any
                  content that you do not have a right to make available under
                  any law or under contractual or fiduciary relationships
                </li>
                <li>
                  Upload, post, email, transmit, or otherwise make available any
                  material that contains software viruses or any other computer
                  code, files, or programs designed to interrupt, destroy, or
                  limit the functionality of any computer software or hardware
                  or telecommunications equipment
                </li>
              </ul>
            </div>

            {/* Medical Disclaimer */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  6. Medical Disclaimer
                </h2>
              </div>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <p className="text-gray-700 leading-relaxed font-medium">
                  IMPORTANT: The content provided through RxIncredible's
                  services is for informational purposes only and is not
                  intended as a substitute for professional medical advice,
                  diagnosis, or treatment. Always seek the advice of your
                  physician or other qualified health provider with any
                  questions you may have regarding a medical condition.
                </p>
              </div>
              <p className="text-gray-600 leading-relaxed mt-4">
                Never disregard professional medical advice or delay in seeking
                it because of something you have read on RxIncredible. If you
                think you may have a medical emergency, call your doctor or
                emergency services immediately.
              </p>
            </div>

            {/* Prescription Services */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  7. Prescription Services
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                RxIncredible provides prescription analysis and pharmacy
                services. All prescriptions are processed by licensed
                pharmacists and healthcare professionals.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>
                  All prescriptions are subject to verification and approval
                </li>
                <li>
                  We reserve the right to refuse service for any prescription
                  that appears fraudulent or unsafe
                </li>
                <li>
                  Prescription medications will only be dispensed with valid
                  prescriptions
                </li>
                <li>
                  Delivery times may vary based on location and availability
                </li>
              </ul>
            </div>

            {/* Payment and Billing */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  8. Payment and Billing
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree to provide current, complete, and accurate purchase
                and account information for all purchases made at RxIncredible.
                You agree to promptly update account and payment information,
                including email address, payment method, and payment card
                expiration date, so that we can complete your transactions and
                contact you as needed.
              </p>
              <p className="text-gray-600 leading-relaxed">
                All prices are subject to change without notice. The price
                charged for a product or service will be the price in effect at
                the time the order is placed.
              </p>
            </div>

            {/* Refund and Cancellation */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  9. Refund and Cancellation Policy
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our refund and cancellation policy is designed to be fair and
                transparent. Please review our separate Refund and Cancellation
                Policy for detailed information.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>
                  Cancellations must be requested before the service is
                  initiated
                </li>
                <li>
                  Once an order is placed, it cannot be cancelled under normal
                  circumstances
                </li>
                <li>Cancellation is only allowed if the payment has failed</li>
                <li>
                  Refunds are processed within 5–7 business days, only if your
                  payment is failed and amount is deducted
                </li>
                <li>
                  Prescription orders may not be eligible for cancellation once
                  processed
                </li>
                <li>
                  Consultation fees are non-refundable once the consultation has
                  commenced
                </li>
              </ul>
            </div>

            {/* Intellectual Property */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  10. Intellectual Property Rights
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                The Service is protected by copyright, trademark, and other laws
                of both the India and foreign countries. Except as expressly
                provided in these Terms and Conditions, no part of the Service
                may be copied, reproduced, distributed, republished, downloaded,
                displayed, posted, or transmitted in any form or by any means
                without our prior written consent.
              </p>
              <p className="text-gray-600 leading-relaxed">
                The RxIncredible name, logo, and all related trademarks,
                graphics, logos, and service marks are our property or our
                licensors.
              </p>
            </div>

            {/* Limitation of Liability */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  11. Limitation of Liability
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                In no event shall RxIncredible, its officers, directors,
                employees, or agents be liable for any indirect, incidental,
                special, consequential, or punitive damages, including without
                limitation, loss of profits, data, use, goodwill, or other
                intangible losses, resulting from (i) your use or inability to
                use the Service; (ii) any unauthorized access to or use of our
                servers and/or any personal information stored therein.
              </p>
            </div>

            {/* Governing Law */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  12. Governing Law
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                These Terms and Conditions shall be governed by and construed in
                accordance with the laws of India, without regard to its
                conflict of law provisions. You agree to submit to the exclusive
                jurisdiction of the courts located in Nagpur, Maharashtra, India
                for any dispute arising out of or relating to these Terms and
                Conditions or your use of the Service.
              </p>
            </div>

            {/* Changes to Terms */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  13. Changes to Terms
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                RxIncredible reserves the right, at its sole discretion, to
                modify or replace these Terms and Conditions at any time. We
                will provide notice of any significant changes. What constitutes
                a material change will be determined at our sole discretion.
                Your continued use of the Service after any such change
                constitutes your acceptance of the new Terms and Conditions.
              </p>
            </div>

            {/* Contact Information */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-[#2563EB]" />
                <h2 className="text-2xl font-bold text-[#1E3A8A]">
                  14. Contact Information
                </h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you have any questions about these Terms and Conditions,
                please contact us:
              </p>
              <div className="bg-blue-50 rounded-lg p-4 ml-4">
                <p className="text-gray-700">
                  <strong>Email : </strong>
                  <a href="mailto:info@rxincredible.com">
                    info@rxincredible.com
                  </a>
                  <br />
                  <strong>Phone : </strong>{" "}
                  <a href="tel:9822848689">9822848689</a>
                  <br />
                  <strong>Address :</strong> 234 Shree Nagar, Nagpur-15,
                  Maharashtra, India
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
