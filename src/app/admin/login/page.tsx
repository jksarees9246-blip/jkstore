// "use client";
// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/app/lib/supabaseClient";

// export default function AdminLogin() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [isSignup, setIsSignup] = useState(false);
//   const router = useRouter();

//   // 🔐 Handle email/password login or signup
//   async function handleAuth() {
//     try {
//       setLoading(true);
//       if (isSignup) {
//         const { data, error } = await supabase.auth.signUp({
//           email,
//           password,
//         });
//         if (error) throw error;
//         alert("✅ Signup successful! Please verify your email before login.");
//       } else {
//         const { data, error } = await supabase.auth.signInWithPassword({
//           email,
//           password,
//         });
//         if (error) throw error;
//         alert("✅ Login successful!");
//         router.push("/admin/dashboard/");
//       }
//     } catch (err: any) {
//       alert("❌ " + err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   // 🔵 Google Login
//   async function handleGoogleLogin() {
//     try {
//       const { data, error } = await supabase.auth.signInWithOAuth({
//         provider: "google",
//         options: {
//           redirectTo: `${window.location.origin}/admin/dashboard`,
//         },
//       });
//       if (error) throw error;
//     } catch (err: any) {
//       alert("❌ Google Login failed: " + err.message);
//     }
//   }

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
//       <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm">
//         <h1 className="text-2xl font-bold text-center mb-4">
//           {isSignup ? "🆕 Admin Signup" : "🔐 Admin Login"}
//         </h1>

//         <input
//           type="email"
//           placeholder="Email"
//           className="border p-2 w-full rounded mb-3"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//         />

//         <input
//           type="password"
//           placeholder="Password"
//           className="border p-2 w-full rounded mb-4"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//         />

//         <button
//           disabled={loading}
//           onClick={handleAuth}
//           className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
//         >
//           {loading ? "Please wait..." : isSignup ? "Sign Up" : "Login"}
//         </button>

//         {/* Toggle login/signup */}
//         <p className="text-center text-sm mt-3">
//           {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
//           <button
//             onClick={() => setIsSignup(!isSignup)}
//             className="text-blue-600 underline"
//           >
//             {isSignup ? "Login" : "Sign Up"}
//           </button>
//         </p>

//         {/* <div className="mt-6 text-center">
//           <p className="text-gray-500 mb-2">or</p>
//           <button
//             onClick={handleGoogleLogin}
//             className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded py-2 hover:bg-gray-50 transition"
//           >
//             <img
//               src="https://www.svgrepo.com/show/475656/google-color.svg"
//               alt="Google"
//               className="w-5 h-5"
//             />
//             <span>Continue with Google</span>
//           </button>
//         </div> */}
//       </div>
//     </div>
//   );
// }

"use client";
import { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else router.push("/admin/dashboard");
  }

  return (
    
       <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
       <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm">
         <h1 className="text-2xl font-bold text-center mb-4">
           Only Admin Login
         </h1>
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="border p-2 w-full rounded mb-3"/>
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border p-2 w-full rounded mb-4"/>
      <button onClick={login} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
>Login</button>
    </div>
    </div>
    
  );
}
