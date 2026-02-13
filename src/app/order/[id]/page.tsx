"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import Image from "next/image";
import { useParams } from "next/navigation";

export default function InvoicePage() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    fetchOrder();
  }, []);

  async function fetchOrder() {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    setOrder(data);
  }

  if (!order)
    return <div className="p-10 text-center">Loading invoice...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">

      <h1 className="text-2xl font-bold text-center mb-6">
        🧾 Order Invoice
      </h1>

      {order.items.map((item: any, i: number) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b py-3"
        >
          <Image
            src={item.image}
            width={80}
            height={100}
            alt={item.name}
            className="rounded"
          />

          <div className="flex-1">
            <p className="font-semibold">{item.name}</p>
            <p className="text-sm text-gray-500">
              Qty: {item.qty} × ₹{item.price}
            </p>
          </div>

          <p className="font-bold">₹{item.total}</p>
        </div>
      ))}

      <div className="text-right mt-6 space-y-1">
        <p>Subtotal: ₹{order.subtotal}</p>
        <p>GST: ₹{order.gst}</p>
        <p className="text-lg font-bold">Grand Total: ₹{order.total}</p>
      </div>

      <button
        onClick={() => window.print()}
        className="mt-6 w-full bg-black text-white py-2 rounded"
      >
        Print Invoice
      </button>
    </div>
  );
}
