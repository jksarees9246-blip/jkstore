// import { supabaseServer } from "@/app/lib/supabaseServer";

// export async function POST(req: Request) {
//   try {
//     const { id } = await req.json();

//     const { error } = await supabaseServer
//       .from("products")
//       .update({
//         discount_percent: 0,
//         countdown_enabled: false,
//         countdown_time: null,
//         sale_end_date: null,
//       })
//       .eq("id", id);

//     if (error) {
//       console.error("Supabase error:", error);
//       return Response.json({ success: false, error: error.message });
//     }

//     return Response.json({ success: true });
//   } catch (err: any) {
//     return Response.json({ success: false, error: err.message });
//   }
// }

export const dynamic = "force-dynamic";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    const supabaseServer = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseServer
      .from("products")
      .update({
        discount_percent: 0,
        countdown_enabled: false,
        countdown_time: null,
        sale_end_date: null,
      })
      .eq("id", id);

    if (error) {
      return Response.json({ success: false, error: error.message });
    }

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message });
  }
}
