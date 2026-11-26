import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { isSaved, removeSaved, saveLogin } from './savedLogins.js';

/* Logout with an Instagram-style "Save your login info?" question.
   Save → the account shows on this device's login screen next time. Not now → nothing is kept.
   Usage: const [askLogout, prompt] = useLogoutPrompt('user', me, () => { logout(); nav('/user/login'); });
          <button onClick={askLogout}>Logout</button> {prompt} */
export function useLogoutPrompt(app, me, doLogout) {
  const [open, setOpen] = useState(false);
  const ask = () => {
    // Already saved on this device: keep it (refresh the name/photo) and log out straight away.
    if (me?.phone && isSaved(app, me.phone)) { saveLogin(app, me); doLogout(); return; }
    if (!me?.phone) { doLogout(); return; }
    setOpen(true);
  };
  const finish = (save) => {
    if (save) saveLogin(app, { phone: me.phone, name: me.name, avatar: me.avatar });
    else removeSaved(app, me.phone);
    setOpen(false);
    doLogout();
  };
  const prompt = open ? (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="save-login-title" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-700"><KeyRound size={26} /></span>
        <h2 id="save-login-title" className="mt-4 text-lg font-bold text-slate-900">Save your login info?</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">Next time, your account will show on this device so you can log in with one tap. An OTP is still sent to your number.</p>
        <button type="button" onClick={() => finish(true)} className="mt-5 h-12 w-full rounded-xl bg-[#B9542C] text-[15px] font-bold text-white hover:brightness-110">Save</button>
        <button type="button" onClick={() => finish(false)} className="mt-2 h-11 w-full rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Not now</button>
      </div>
    </div>
  ) : null;
  return [ask, prompt];
}
