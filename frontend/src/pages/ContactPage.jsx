import React, { useState } from 'react';
import { PublicNavbar } from '../components/public/PublicNavbar';
import { PublicFooter } from '../components/public/PublicFooter';
import { Mail, MessageSquare, MapPin, Send, CheckCircle2, Clock, Sparkles } from 'lucide-react';

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate safe client message dispatch
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: 'General Inquiry', message: '' });
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-12">

        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-semibold">
            <Mail className="w-3.5 h-3.5" />
            Get in Touch
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            Contact SocialSync AI
          </h1>
          <p className="text-base text-[#475569] dark:text-slate-300">
            Have questions about our multi-platform publishing platform or custom plans? We’d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Contact Cards */}
          <div className="space-y-4">

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-[#E2E8F0] dark:border-slate-800 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Email Inquiries</h3>
              <p className="text-xs text-[#475569] dark:text-slate-400">
                Direct questions, technical support, or partnership inquiries.
              </p>
              <p className="text-sm font-semibold text-blue-600 dark:text-cyan-400">
                support@socialsync.ai
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                (Official support inbox)
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-[#E2E8F0] dark:border-slate-800 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Office Location</h3>
              <p className="text-xs text-[#475569] dark:text-slate-400">
                SocialSync AI Global Operations
              </p>
              <p className="text-sm font-medium text-[#0F172A] dark:text-slate-300">
                Colombo, Western Province, Sri Lanka
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                (HQ Address Placeholder)
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-[#E2E8F0] dark:border-slate-800 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Support Response Times</h3>
              <p className="text-xs text-[#475569] dark:text-slate-400">
                Standard queue response window: within 24 hours. Priority accounts respond within 4 hours.
              </p>
              <span className="inline-block px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                System Status: Operational
              </span>
            </div>

          </div>

          {/* Right 2 Columns: Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900/80 border border-[#E2E8F0] dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">Send Us a Message</h2>
                <p className="text-xs text-[#475569] dark:text-slate-400">
                  Fill in your details below and a team representative will respond promptly.
                </p>
              </div>

              {submitted ? (
                <div className="p-8 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-center space-y-3 animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">Message Received!</h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300/80 max-w-sm mx-auto leading-relaxed">
                    Thank you for reaching out. We have received your inquiry and our support team will respond to your email address shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#0F172A] dark:text-slate-300">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Alex Morgan"
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-hidden focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#0F172A] dark:text-slate-300">Email Address</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="alex@example.com"
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-hidden focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#0F172A] dark:text-slate-300">Subject</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-hidden focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Plan & Pricing Question">Plan & Pricing Question</option>
                      <option value="Technical Support">Technical Support</option>
                      <option value="OAuth & Channel Connection">OAuth & Channel Connection</option>
                      <option value="Partnership / Enterprise">Partnership / Enterprise</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#0F172A] dark:text-slate-300">Your Message</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Describe how we can assist you..."
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] text-[#0F172A] dark:text-[#F8FAFC] text-sm focus:outline-hidden focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting Message...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Inquiry
                      </>
                    )}
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
export default ContactPage;
