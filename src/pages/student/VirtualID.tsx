import { useStore } from '../../store';
import { QRCodeSVG } from 'qrcode.react';
import { Mail, Phone, Hash, BookOpen, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VirtualID() {
  const { currentUser } = useStore();

  if (!currentUser || currentUser.role !== 'student') return null;

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-violet-950">Virtual ID Card</h1>
        <p className="text-violet-600 mt-2">Your digital identity</p>
      </div>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2rem] shadow-2xl shadow-violet-200/50 overflow-hidden border border-violet-100 relative"
      >
        {/* Header */}
        <div className="bg-violet-600 px-8 py-6 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <h2 className="text-2xl font-black text-white tracking-wider relative z-10">COLLEGE NAME</h2>
          <p className="text-violet-200 text-sm font-medium tracking-widest uppercase mt-1 relative z-10">Student Identity Card</p>
        </div>

        {/* Body */}
        <div className="p-8 pt-12 relative">
          {/* Photo */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 z-20">
            <img 
              src={currentUser.photo || `https://ui-avatars.com/api/?name=${currentUser.name}&background=8b5cf6&color=fff`} 
              alt={currentUser.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="text-center mt-4 mb-8">
            <h3 className="text-2xl font-bold text-gray-900">{currentUser.name}</h3>
            <p className="text-violet-600 font-semibold text-lg tracking-wide mt-1">{currentUser.rollNo}</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4 text-gray-700 bg-violet-50/50 p-3 rounded-xl border border-violet-100/50">
              <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                <BookOpen size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Department</p>
                <p className="font-semibold">{currentUser.department}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-gray-700 bg-violet-50/50 p-3 rounded-xl border border-violet-100/50">
              <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                <GraduationCap size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Batch</p>
                <p className="font-semibold">{currentUser.batch}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-gray-700 bg-violet-50/50 p-3 rounded-xl border border-violet-100/50">
              <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email</p>
                <p className="font-semibold truncate">{currentUser.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-gray-700 bg-violet-50/50 p-3 rounded-xl border border-violet-100/50">
              <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Phone</p>
                <p className="font-semibold">{currentUser.phone}</p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center pt-6 border-t border-gray-100">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 mb-3">
              <QRCodeSVG value={JSON.stringify({ id: currentUser.id, rollNo: currentUser.rollNo })} size={120} level="H" />
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">Scan to verify</p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-500 font-medium">This is a system generated virtual ID card.</p>
        </div>
      </motion.div>
    </div>
  );
}
