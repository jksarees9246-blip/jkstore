"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import Image from "next/image";
import { useRef } from "react";


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
  image_path?: string | null;
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
  const [, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountEnabled, setdiscountEnabled] = useState<boolean>(false);


  // removed offer_text input

  // NEW: countdown fields
  const [countdownEnabled, setCountdownEnabled] = useState<boolean>(false);
  const [countdownTime, setCountdownTime] = useState<string>(""); // HH:MM:SS
  const [saleEndDate, setSaleEndDate] = useState<string>(""); // datetime-local
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showWhatsappInput, setShowWhatsappInput] = useState(false);
  const [isWhatsappSaved, setIsWhatsappSaved] = useState(false);
  const [search, setSearch] = useState("");
  const formRef = useRef<HTMLDivElement | null>(null);
  


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

  const filteredProducts = products.filter((p) => {
  const searchText = search.toLowerCase();

  const nameMatch = p.name?.toLowerCase().includes(searchText);

  const priceMatch =
    String(p.price).includes(searchText) ||
    (p.discount_percent &&
      String(
        Math.round(p.price - (p.price * p.discount_percent) / 100)
      ).includes(searchText));

  return nameMatch || priceMatch;
});


  // async function uploadImage(): Promise<string> {
  //   if (!imageFile) return "";

  //   const fileName = `product-${Date.now()}-${imageFile.name}`;
  //   const { error } = await supabase.storage.from("product-images").upload(fileName, imageFile);

  //   if (error) throw error;

  //   const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(fileName);

  //   return publicUrl.publicUrl;
  // }

  async function uploadImage(): Promise<{ url: string; path: string }> {
    if (!imageFile) throw new Error("No image");

    const fileName = `product-${Date.now()}-${imageFile.name}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageFile);

    if (error) throw error;

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return {
      url: data.publicUrl,
      path: fileName, // ✅ save this in DB
    };
  }


  // async function handleAddProduct() {
  //   if (!validateForm()) return;
  //   try {
  //     setLoading(true);

  //     const imageUrl = await uploadImage();

  //     const { error } = await supabase.from("products").insert([
  //       {
  //         name,
  //         price,
  //         min_qty: minQty,
  //         image_url: imageUrl,
  //         category,
  //         // rating removed
  //         discount_percent: Number(discountPercent || 0),
  //         // removed offer_text
  //         offer_start: null,
  //         offer_end: null,
  //         // new fields:
  //         countdown_enabled: countdownEnabled,
  //         countdown_time: countdownTime || null,
  //         sale_end_date: saleEndDate ? new Date(saleEndDate).toISOString() : null,
  //       },
  //     ]);

  //     if (error) throw error;

  //     resetForm();
  //     await fetchProducts();
  //     alert("✅ Product added successfully!");
  //   } catch (err: any) {
  //     alert("❌ Error adding product");
  //     console.error(err);
  //   } finally {
  //     setLoading(false);
  //   }
  // }
async function handleAddProduct() {
  if (!validateForm()) return;

  try {
    setLoading(true);

    // 1️⃣ Upload image (same as before)
    // const imageUrl = await uploadImage();
    const { url, path } = await uploadImage();

    // 2️⃣ Convert values to numbers
    const priceNum = Number(price);                // ex: 110
    const discountAmt = Number(discountAmount);    // ex: 99

    // 3️⃣ Convert DISCOUNT AMOUNT → DISCOUNT PERCENT
    let discountPercent = 0;

    if (
      discountAmt > 0 &&
      priceNum > 0 &&
      discountAmt < priceNum
    ) {
      discountPercent = Number(
        (((priceNum - discountAmt) / priceNum) * 100).toFixed(2)
      );

    }

    // 4️⃣ Insert into database
    const { error } = await supabase.from("products").insert([
      {
        name,
        price: priceNum,
        min_qty: Number(minQty),
        image_url: url,
        image_path: path, // ✅ NEW
        category,

        // ✅ SAVE PERCENT ONLY
        discount_percent: discountPercent,

        countdown_enabled: countdownEnabled,
        countdown_time: countdownTime || null,
        sale_end_date: saleEndDate
          ? new Date(saleEndDate).toISOString()
          : null,
      },
    ]);

    if (error) throw error;

    // 5️⃣ Reset & refresh
    resetForm();
    await fetchProducts();

    alert(
      `✅ Product added\nPrice: ₹${priceNum}\nDiscount: ₹${discountAmt}\nSaved as: ${discountPercent}%`
    );
  } catch (err: any) {
    console.error(err);
    alert("❌ Error adding product");
  } finally {
    setLoading(false);
  }
}

  // async function handleUpdate() {
  //   if (!validateForm()) return;

  //   try {
  //     setLoading(true);

  //     let imageUrl = "";
  //     if (imageFile) imageUrl = await uploadImage();

  //     const updates: any = {
  //       name,
  //       price,
  //       min_qty: minQty,
  //       category,
  //       discount_percent: Number(discountPercent || 0),
  //       // removed offer_text
  //       offer_start: null,
  //       offer_end: null,
  //       countdown_enabled: countdownEnabled,
  //       countdown_time: countdownTime || null,
  //       sale_end_date: saleEndDate ? new Date(saleEndDate).toISOString() : null,
  //     };

  //     if (imageUrl) updates.image_url = imageUrl;

  //     const { error } = await supabase.from("products").update(updates).eq("id", editId!);

  //     if (error) throw error;

  //     resetForm();
  //     await fetchProducts();
  //     alert("✅ Product updated successfully!");
  //   } catch (err: any) {
  //     console.error(err.message);
  //     alert("❌ Error updating product");
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  async function handleUpdate() {
  if (!validateForm()) return;

  try {
    setLoading(true);

    // 1️⃣ Upload new image only if selected
    let imageUrl = "";
    let imagePath = "";

    if (imageFile) {
      const uploaded = await uploadImage();
      imageUrl = uploaded.url;
      imagePath = uploaded.path;
    }

    // 2️⃣ Convert values to numbers
    const priceNum = Number(price);                // ex: 110
    const discountAmt = Number(discountAmount);    // ex: 99

    // 3️⃣ Convert DISCOUNT AMOUNT → DISCOUNT PERCENT
    let discountPercent = 0;

    if (
      discountAmt > 0 &&
      priceNum > 0 &&
      discountAmt < priceNum
    ) {
     discountPercent = Number(
        (((priceNum - discountAmt) / priceNum) * 100).toFixed(2)
      );

    }

    // 4️⃣ Prepare update object
    const updates: any = {
      name,
      price: priceNum,
      min_qty: Number(minQty),
      category,

      // ✅ Save calculated percent
      discount_percent: discountPercent,

      countdown_enabled: countdownEnabled,
      countdown_time: countdownTime || null,
      sale_end_date: saleEndDate
        ? new Date(saleEndDate).toISOString()
        : null,
    };

    // 5️⃣ Update image only if changed
    if (imageUrl) {
      updates.image_url = imageUrl;
      updates.image_path = imagePath; // ✅ NEW

    }

    // 6️⃣ Update product
    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", editId!);

    if (error) throw error;

    // 7️⃣ Reset & refresh
    resetForm();
    await fetchProducts();

    alert(
      `✅ Product updated\nPrice: ₹${priceNum}\nDiscount: ₹${discountAmt}\nSaved as: ${discountPercent}%`
    );
  } catch (err: any) {
    console.error(err);
    alert("❌ Error updating product");
  } finally {
    setLoading(false);
  }
}


  // async function handleDelete(id: number, imageUrl?: string) {
  //   if (!confirm("🗑️ Delete this product?")) return;

  //   try {
  //     setLoading(true);

  //     const { error: deleteError } = await supabase.from("products").delete().eq("id", id);

  //     if (deleteError) throw deleteError;

  //     if (imageUrl) {
  //       const filePath = imageUrl.split("/").pop();
  //       if (filePath) {
  //         const { error: storageError } = await supabase.storage.from("product-images").remove([filePath]);
  //         if (storageError) console.warn("⚠️ Failed to delete image:", storageError.message);
  //       }
  //     }

  //     await fetchProducts();
  //     alert("🗑️ Product deleted!");
  //   } catch (err: any) {
  //     console.error(err.message);
  //     alert("❌ Error deleting product");
  //   } finally {
  //     setLoading(false);
  //   }
  // }
  async function handleDelete(
  id: number,
  imagePath?: string | null
) {
  if (!confirm("🗑️ Delete this product?")) return;

  setLoading(true);

  try {
    console.log("▶ DELETE START");
    console.log("Product ID:", id);
    console.log("Image path:", imagePath);

    // 1️⃣ DELETE IMAGE FROM STORAGE
    if (imagePath) {
      console.log("🗑️ Attempting storage delete...");

      const { data, error: storageError } = await supabase.storage
        .from("product-images")
        .remove([imagePath]);

      if (storageError) {
        console.error("❌ STORAGE DELETE ERROR:", storageError);

        alert(
          `❌ Image delete failed\n\n` +
          `Message: ${storageError.message}\n`
          // `Status: ${storageError.statusCode ?? "unknown"}`
        );

        // STOP here so you know image failed
        return;
      }

      console.log("✅ Image deleted:", data);
    } else {
      console.warn("⚠️ No imagePath provided, skipping image delete");
    }

    // 2️⃣ DELETE PRODUCT ROW
    console.log("🗑️ Deleting product row...");

    const { error: dbError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (dbError) {
      console.error("❌ DB DELETE ERROR:", dbError);

      alert(
        `❌ Product delete failed\n\n` +
        `Message: ${dbError.message}`
      );
      return;
    }

    console.log("✅ Product deleted");

    await fetchProducts();
    alert("✅ Product & image deleted successfully");
  } catch (err: any) {
    console.error("🔥 UNEXPECTED ERROR:", err);
    alert(`❌ Unexpected error\n${err.message}`);
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
      <div
        ref={formRef}
 
      className="border p-6 rounded-xl mb-8 bg-white shadow">
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
                placeholder="Discount Amount"
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />

            )}


          {/* IMAGE UPLOAD */}
          <input className="border p-3 rounded-lg" type="file" accept="image/*" onChange={handleImageChange} />

          {/* NEW: Countdown Toggle */}
          <div className="flex items-center gap-3 col-span-full">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={discountEnabled} onChange={(e) => setdiscountEnabled(e.target.checked)} />
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

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 Search by name or price..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-3 rounded-lg w-full md:w-96"
        />
      </div>
  

      {/* Product List */}
      <h2 className="font-semibold text-lg mb-4 text-gray-700">📦 Products</h2>

      {/* {products.length === 0 ? ( */}
      {filteredProducts.length === 0 ? (
        <p className="text-gray-500">No products found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* {products.map((p) => ( */}
          {filteredProducts.map((p) => (

            <div key={p.id} className="border rounded-xl bg-white p-4 shadow hover:shadow-lg transition">
              <Image src={p.image_url || "/no-image.png"} alt={p.name} width={250} height={250} className="rounded-lg w-full h-48 object-cover" />

              <h3 className="font-semibold mt-3 text-gray-800">{p.name}</h3>
              {/* <p className="text-gray-700">₹{p.price}</p> */}
              {/* PRICE DISPLAY */}
              {p.discount_percent && p.discount_percent > 0 ? (
                <div className="mt-1">
                  <p className="text-sm text-gray-500 line-through">
                    ₹{p.price}
                  </p>

                  <p className="text-lg font-bold text-green-600">
                    ₹{Math.round(p.price - (p.price * p.discount_percent) / 100)}
                  </p>

                  <p className="text-xs text-red-600 font-semibold">
                    {p.discount_percent}%
                  </p>
                </div>
              ) : (
                <p className="text-gray-700 font-semibold">₹{p.price}</p>
              )}

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
                    setTimeout(() => {
                    formRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
              }, 100);
                  }}
                  className="
                      text-blue-600 
                      text-sm 
                      font-medium
                      transition-all 
                      duration-200
                      hover:text-white
                      hover:bg-blue-600
                      px-3
                      py-1
                      rounded-md
                    "               
                     >
                  Edit
                </button>

                <button onClick={() => handleDelete(p.id, p.image_path)}  className="
                  text-red-600
                  text-sm
                  font-medium
                  transition-all
                  duration-200
                  hover:text-white
                  hover:bg-red-600
                  px-3
                  py-1
                  rounded-md
                "
                >
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
