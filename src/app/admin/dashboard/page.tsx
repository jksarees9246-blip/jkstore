"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import Image from "next/image";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string | null;
  min_qty?: number | null;
  category?: string | null;
  // rating removed
  discount_percent?: number | null;
  // offer_text removed
  offer_start?: string | null;
  offer_end?: string | null;
  countdown_enabled?: boolean | null;
  countdown_time?: string | null; // "HH:MM:SS"
  sale_end_date?: string | null; // ISO string
}

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [minQty, setMinQty] = useState("");
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // offer/discount (kept discount_percent)
  const [discountPercent, setDiscountPercent] = useState("");
  // removed offer_text input

  // NEW: countdown fields
  const [countdownEnabled, setCountdownEnabled] = useState<boolean>(false);
  const [countdownTime, setCountdownTime] = useState<string>(""); // HH:MM:SS
  const [saleEndDate, setSaleEndDate] = useState<string>(""); // datetime-local
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showWhatsappInput, setShowWhatsappInput] = useState(false);
  const [isWhatsappSaved, setIsWhatsappSaved] = useState(false);


  useEffect(() => {
    fetchProducts();
    fetchWhatsappNumber();

  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (error) console.error(error);
    else setProducts(data || []);
  }

  function validateForm() {
    if (!name.trim() || Number(price) <= 0 || Number(minQty) <= 0 || !category) {
      alert("❗ Please fill all fields correctly.");
      return false;
    }

    if (!editId && !imageFile) {
      alert("❗ Please upload an image.");
      return false;
    }

    if (imageFile && imageFile.size > 1024 * 1024) {
      alert("❗ Image size must be less than 1 MB.");
      return false;
    }

    // optional: validate countdownTime format HH:MM:SS if provided
    if (countdownTime && !/^\d{1,2}:\d{2}:\d{2}$/.test(countdownTime)) {
      alert("❗ Countdown time must be in HH:MM:SS format (e.g. 05:00:00).");
      return false;
    }

    return true;
  }

  async function uploadImage(): Promise<string> {
    if (!imageFile) return "";

    const fileName = `product-${Date.now()}-${imageFile.name}`;
    const { error } = await supabase.storage.from("product-images").upload(fileName, imageFile);

    if (error) throw error;

    const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(fileName);

    return publicUrl.publicUrl;
  }

  async function handleAddProduct() {
    if (!validateForm()) return;
    try {
      setLoading(true);

      const imageUrl = await uploadImage();

      const { error } = await supabase.from("products").insert([
        {
          name,
          price,
          min_qty: minQty,
          image_url: imageUrl,
          category,
          // rating removed
          discount_percent: Number(discountPercent || 0),
          // removed offer_text
          offer_start: null,
          offer_end: null,
          // new fields:
          countdown_enabled: countdownEnabled,
          countdown_time: countdownTime || null,
          sale_end_date: saleEndDate ? new Date(saleEndDate).toISOString() : null,
        },
      ]);

      if (error) throw error;

      resetForm();
      await fetchProducts();
      alert("✅ Product added successfully!");
    } catch (err: any) {
      alert("❌ Error adding product");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!validateForm()) return;

    try {
      setLoading(true);

      let imageUrl = "";
      if (imageFile) imageUrl = await uploadImage();

      const updates: any = {
        name,
        price,
        min_qty: minQty,
        category,
        discount_percent: Number(discountPercent || 0),
        // removed offer_text
        offer_start: null,
        offer_end: null,
        countdown_enabled: countdownEnabled,
        countdown_time: countdownTime || null,
        sale_end_date: saleEndDate ? new Date(saleEndDate).toISOString() : null,
      };

      if (imageUrl) updates.image_url = imageUrl;

      const { error } = await supabase.from("products").update(updates).eq("id", editId!);

      if (error) throw error;

      resetForm();
      await fetchProducts();
      alert("✅ Product updated successfully!");
    } catch (err: any) {
      console.error(err.message);
      alert("❌ Error updating product");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number, imageUrl?: string) {
    if (!confirm("🗑️ Delete this product?")) return;

    try {
      setLoading(true);

      const { error: deleteError } = await supabase.from("products").delete().eq("id", id);

      if (deleteError) throw deleteError;

      if (imageUrl) {
        const filePath = imageUrl.split("/").pop();
        if (filePath) {
          const { error: storageError } = await supabase.storage.from("product-images").remove([filePath]);
          if (storageError) console.warn("⚠️ Failed to delete image:", storageError.message);
        }
      }

      await fetchProducts();
      alert("🗑️ Product deleted!");
    } catch (err: any) {
      console.error(err.message);
      alert("❌ Error deleting product");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditId(null);
    setName("");
    setPrice("");
    setMinQty("");
    setCategory("");
    setDiscountPercent("");
    setImageFile(null);
    setImagePreview(null);

    // countdown resets
    setCountdownEnabled(false);
    setCountdownTime("");
    setSaleEndDate("");
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("❗ Image size must be less than 1 MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function fetchWhatsappNumber() {
  const { data, error } = await supabase
    .from("settings")
    .select("whatsapp_number")
    .eq("id", 1)
    .single();

  if (!error && data) {
    setWhatsappNumber(data.whatsapp_number || "");
    setIsWhatsappSaved(Boolean(data.whatsapp_number));
  }
}

async function saveWhatsappNumber() {
  if (!whatsappNumber.trim()) {
    alert("Please enter a number");
    return;
  }

  const { error } = await supabase
    .from("settings")
    .update({ whatsapp_number: whatsappNumber })
    .eq("id", 1);

  if (error) {
    alert("❌ Failed to save number");
  } else {
    alert("✅ WhatsApp number saved");
    setIsWhatsappSaved(true);
    setShowWhatsappInput(false);
  }
}



  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">🛠️ Admin Dashboard</h1>

      <div className="mb-6">
          <button
            onClick={() => setShowWhatsappInput(!showWhatsappInput)}
            className={`px-4 py-2 rounded-lg text-white 
              ${isWhatsappSaved ? "bg-green-600" : "bg-red-600"}`
            }
          >
            WhatsApp Number
          </button>

          {/* Input Box */}
          {showWhatsappInput && (
            <div className="mt-3 flex items-center gap-3">
              <input
                type="text"
                className="border p-2 rounded w-60"
                placeholder="Enter WhatsApp Number"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
              <button
                onClick={saveWhatsappNumber}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          )}
        </div>


      {/* Add / Edit Form */}
      <div className="border p-6 rounded-xl mb-8 bg-white shadow">
        <h2 className="font-semibold text-lg mb-4 text-gray-700 flex items-center gap-2">
          {editId ? "✏️ Edit Product" : "➕ Add Product"}
        </h2>

        {/* FORM */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input className="border p-3 rounded-lg" placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} />

          <input className="border p-3 rounded-lg" type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />

          <input className="border p-3 rounded-lg" type="number" placeholder="Minimum Qty" value={minQty} onChange={(e) => setMinQty(e.target.value)} />

          {/* CATEGORY DROPDOWN */}
          <select className="border p-3 rounded-lg" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select Category</option>
            <option value="Cotton">Cotton</option>
            <option value="Fancy">Fancy</option>
            <option value="Gadwal">Gadwal</option>
            <option value="Silk">Silk</option>
            <option value="Pattu">Pattu</option>
          </select>

          {/* DISCOUNT */}
          {/* <input className="border p-3 rounded-lg" placeholder="Discount %" type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} /> */}
            {/* DISCOUNT SWITCH */}
            <div className="flex items-center gap-3 col-span-full">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={countdownEnabled}
                  onChange={(e) => setCountdownEnabled(e.target.checked)}
                />
                <span className="text-sm">Enable Discount</span>
              </label>
            </div>

            {/* DISCOUNT INPUT → SHOWN ONLY WHEN ENABLED */}
            {countdownEnabled && (
              <input
                className="border p-3 rounded-lg"
                placeholder="Discount %"
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            )}


          {/* IMAGE UPLOAD */}
          <input className="border p-3 rounded-lg" type="file" accept="image/*" onChange={handleImageChange} />

          {/* NEW: Countdown Toggle */}
          <div className="flex items-center gap-3 col-span-full">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={countdownEnabled} onChange={(e) => setCountdownEnabled(e.target.checked)} />
              <span className="text-sm">Enable Countdown</span>
            </label>
          </div>

          {/* NEW: Countdown Time (HH:MM:SS) */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Countdown Time (HH:MM:SS)</label>
            {/* HTML time input with seconds supported by step */}
            <input
              type="time"
              step={1}
              value={countdownTime}
              onChange={(e) => setCountdownTime(e.target.value)}
              className="border p-2 rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Example: 05:00:00</p>
          </div>

          {/* NEW: Sale End Date */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Sale End Date & Time</label>
            <input
              type="datetime-local"
              value={saleEndDate}
              onChange={(e) => setSaleEndDate(e.target.value)}
              className="border p-2 rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Optional — countdown will not show after this date/time</p>
          </div>
        </div>

        {imagePreview && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Preview:</p>
            <Image src={imagePreview} alt="Preview" width={200} height={200} className="rounded-lg w-40 h-40 object-cover border" />
          </div>
        )}

        <div className="mt-5 flex items-center gap-4">
          <button disabled={loading} onClick={editId ? handleUpdate : handleAddProduct} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow disabled:opacity-60">
            {loading ? "Saving..." : editId ? "Update Product" : "Add Product"}
          </button>

          {editId && (
            <button className="text-sm text-red-500" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Product List */}
      <h2 className="font-semibold text-lg mb-4 text-gray-700">📦 Products</h2>

      {products.length === 0 ? (
        <p className="text-gray-500">No products found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <div key={p.id} className="border rounded-xl bg-white p-4 shadow hover:shadow-lg transition">
              <Image src={p.image_url || "/no-image.png"} alt={p.name} width={250} height={250} className="rounded-lg w-full h-48 object-cover" />

              <h3 className="font-semibold mt-3 text-gray-800">{p.name}</h3>
              <p className="text-gray-700">₹{p.price}</p>
              <p className="text-gray-500 text-sm">Min Qty: {p.min_qty}</p>
              <p className="text-gray-600 text-sm">Category: {p.category}</p>

              {/* Removed rating display */}

              <div className="flex justify-between mt-3">
                <button
                  onClick={() => {
                    setEditId(p.id);
                    setName(p.name || "");
                    setPrice(String(p.price || ""));
                    setMinQty(String(p.min_qty ?? ""));
                    setCategory(p.category || "");
                    setImagePreview(p.image_url || null);
                    setDiscountPercent(String(p.discount_percent ?? ""));
                    // countdown fields
                    setCountdownEnabled(Boolean(p.countdown_enabled));
                    setCountdownTime(p.countdown_time || "");
                    // sale_end_date stored as ISO -> convert to datetime-local format for input
                    setSaleEndDate(p.sale_end_date ? new Date(p.sale_end_date).toISOString().slice(0, 19) : "");
                  }}
                  className="text-blue-600 text-sm"
                >
                  Edit
                </button>

                <button onClick={() => handleDelete(p.id, p.image_url || undefined)} className="text-red-600 text-sm">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
