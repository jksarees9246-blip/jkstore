"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

type ProductType = {
  id: number;
  name: string;
  price: number | string;
  image_url?: string | null;
  min_qty?: number | string;
  category?: string | null;
  // rating removed
  discount_percent?: number | null;
  // offer_text removed
  countdown_enabled?: boolean | null;
  countdown_time?: string | null; // "HH:MM:SS"
  sale_end_date?: string | null; // ISO string
};

const CATEGORIES = ["All", "Cotton", "Fancy", "Gadwal", "Silk", "Pattu"];
const refreshProducts = () => fetchProducts();

async function fetchProducts() {

       const { data, error } = await supabase.from("products").select("*").order("id", { ascending: false });
}




function parseHHMMSSToSeconds(hms: string | undefined | null) {
  if (!hms) return 0;
  const parts = hms.split(":").map((p) => Number(p));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 3600 + parts[1] * 60; // fallback
  }
  return Number(hms) || 0;
}

function formatSecondsToHHMMSS(totalSeconds: number) {
  if (totalSeconds <= 0) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** Countdown component per product */
function CountdownTimer({ countdownEnabled, countdownTime, saleEndDate, id }: {
  countdownEnabled?: boolean | null;
  countdownTime?: string | null;
  saleEndDate?: string | null;
  id: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!countdownEnabled) {
      setSecondsLeft(null);
      return;
    }

    const now = new Date();
    // admin-entered duration in seconds
    const enteredSecs = parseHHMMSSToSeconds(countdownTime);

    // remaining seconds until sale_end_date if provided
    const remainingUntilEnd = saleEndDate ? Math.max(0, Math.ceil((new Date(saleEndDate).getTime() - now.getTime()) / 1000)) : Infinity;

    // if sale_end_date exists and remaining is 0 -> expired
    if (saleEndDate && remainingUntilEnd <= 0) {
      setSecondsLeft(0);
      return;
    }

    // choose min(enteredSecs, remainingUntilEnd) if sale_end_date provided, otherwise enteredSecs
    let initial = enteredSecs;
    if (saleEndDate) initial = Math.min(enteredSecs || Infinity, remainingUntilEnd);

    // if nothing to show
    if (!initial || initial <= 0) {
      setSecondsLeft(0);
      return;
    }

    setSecondsLeft(initial);

    const iv = setInterval(() => {
      setSecondsLeft((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(iv);
          

           // 👇 AUTO REMOVE DISCOUNT WHEN COUNTDOWN ENDS
            fetch("/api/expire-offer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id }),
            })
            .then(() => refreshProducts());

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownEnabled, countdownTime, saleEndDate]);

  if (!countdownEnabled || secondsLeft === null || secondsLeft <= 0) return null;

  return (
    <div className="mt-2 bg-red-600 text-white px-2 py-1 rounded text-sm">
      Sale ends in: <span className="font-semibold">{formatSecondsToHHMMSS(secondsLeft)}</span>
    </div>
  );
}


export default function Home() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [sortOption, setSortOption] = useState<string>("default");
  const [page, setPage] = useState<number>(1);

  const [whatsappNumber, setWhatsappNumber] = useState("");


  const PAGE_SIZE = 12;

  const [cart, setCart] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);

  const [preparing, setPreparing] = useState(false);

  

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from("products").select("*").order("price", { ascending: true });

      if (error) throw error;

      setProducts((data || []) as ProductType[]);
    } catch (err: any) {
      setError(err?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // const getDiscountedPrice = (p: ProductType) => {
  //   const price = Number(p.price || 0);
  //   const disc = Number(p.discount_percent || 0);

  //   if (isNaN(price) || isNaN(disc) || disc <= 0) return price;

  //   return Math.round(price - (price * disc) / 100);
  // };

  const getDiscountedPrice = (p: ProductType) => {
    const price = Number(p.price || 0);
    const disc = Number(p.discount_percent || 0);
    if (!disc || disc <= 0) return price;
    return Math.round(price - (price * disc) / 100);
  };

  const filteredAndSorted = useMemo(() => {
    let list = [...products];

    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      list = list.filter((p) => (p.name || "").toLowerCase().includes(s));
    }

    if (activeCategory !== "All") {
      list = list.filter((p) => p.category === activeCategory);
    }

    if (sortOption === "price-low") {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortOption === "price-high") {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    }

    return list;
  }, [products, debouncedSearch, activeCategory, sortOption]);

  const totalItems = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, page]);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const exist = prev.find((p) => p.id === product.id);
      if (exist) return prev;

      return [...prev, { ...product, qty: Number(product.min_qty || 1) }];
    });
  };

  const updateQty = (productId: number, type: "add" | "remove") => {
    setCart((prev) =>
      prev
        .map((p) => {
          if (p.id === productId) {
            const step = Number(p.min_qty || 1);
            const newQty = type === "add" ? p.qty + step : Math.max(0, p.qty - step);
            return { ...p, qty: newQty };
          }
          return p;
        })
        .filter((p) => p.qty > 0)
    );
  };

  const sendOnWhatsApp = async () => {
    if (cart.length === 0) return;

    let total = 0;

    async function shortenURL(url: string): Promise<string> {
      try {
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error();
        return await res.text();
      } catch {
        return url;
      }
    }

    const lines: string[] = [];

    for (let i = 0; i < cart.length; i++) {
      const p = cart[i];
      // const priceNum = Number(p.price);
      // const subtotal = priceNum * Number(p.qty);
      const discountedPrice = getDiscountedPrice(p); // FIXED
      const subtotal = discountedPrice * p.qty;
      total += subtotal;

      let shortImage = "No image";
      if (p.image_url) shortImage = await shortenURL(p.image_url);

//       lines.push(
//         `${i + 1}. *${p.name}*
// Qty: ${p.qty}
// Price: ₹${priceNum}
// Subtotal: ₹${subtotal}
// Image: ${shortImage}`
//       );
lines.push(
        `${i + 1}. *${p.name}*
        \nQty: ${p.qty}
        \nPrice: ₹${discountedPrice}
        \nSubtotal: ₹${subtotal}
        \nImage: ${shortImage}`
      );
    }

    const gst = Math.round(total * 0.05);
    const grand = total + gst;

    const message = `🛍️ *Order Details*\n\n${lines.join("\n\n")}\n\n--------------------\nTotal: ₹${total}\nGST(5%): ₹${gst}\nGrand Total: ₹${grand}\nPlease Send this massage to Confirm your order.`;

    // const phoneNumber = {whatsappNumber};
    
    // window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`);
    // OPEN WHATSAPP IMMEDIATELY (within 100ms)
  setTimeout(() => {
    window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    setPreparing(false); // hide popup after redirect
  }, 100);
  };

  const ShimmerCard = () => (
    <div className="animate-pulse bg-white rounded-2xl shadow p-3 flex flex-col items-center">
      <div className="bg-gray-200 h-40 w-full rounded-lg mb-3" />
      <div className="h-4 w-2/3 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-1/3 bg-gray-200 rounded mb-2" />
      <div className="h-8 w-full bg-gray-200 rounded" />
    </div>
  );

  useEffect(() => {
  fetchWhatsappNumber();
}, []);

async function fetchWhatsappNumber() {
  const { data, error } = await supabase
    .from("settings")
    .select("whatsapp_number")
    .eq("id", 1)
    .single();

  if (!error && data) {
    setWhatsappNumber(data.whatsapp_number);
  }
}


  return (
    <div className="min-h-screen bg-gray-50">
{/* Header */}
      <header className="sticky top-0 bg-white shadow z-20">
      

      
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Image
              src="https://oscosxtqmegjdcgzbdko.supabase.co/storage/v1/object/public/product-images/product-1762957690479-Logo3.png"
              alt="Logo"
              width={50}
              height={50}
            />
            <div>
              <h2 className="text-xl font-bold">J K Sarees</h2>
              <p className="text-xs text-gray-500 leading-tight">
                21-1-601, Beside 94 Bus Stop, High Court Road, Hyderabad
              </p>
              <p className="text-xm text-gray-500 ">📞 9246226011</p>
            </div>
          </div>
        </div>

         <div className="flex items-center justify-between max-w-6xl mx-auto p-4">

            <button
            onClick={() =>
              window.open(
                "https://www.google.com/maps/place/J+K+Sarees+Cotton+Company/@17.367972,78.4712925,17z/data=!3m1!4b1!4m6!3m5!1s0x3bcb97e55963cf01:0x6db6f1b02043e7c0!8m2!3d17.3679669!4d78.4738674!16s%2Fg%2F11g0hy52s1?entry=ttu&g_ep=EgoyMDI1MTExMi4wIKXMDSoASAFQAw%3D%3D",
                "_blank"
              )
            }
            className="flex items-center justify-center border-1 border-black bg-white-600 text-black px-4 py-2 rounded-lg hover:bg-black-700 text-sm min-w-[110px]"
          >
             <img
                src="https://oscosxtqmegjdcgzbdko.supabase.co/storage/v1/object/public/product-images/icons8-place-marker-24.png"
                alt="Location"
                className="w-5 h-5"
              />
            Location
          </button>
          
            <Link href="/admin/login" className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm">
              Admin
            </Link>

            {cart.length > 0 && (
              <button onClick={() => setShowCart(true)} className="relative flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg min-w-[110px]">
                 Cart
                <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full px-2">{cart.length}</span>
              </button>
            )}
          </div>
    
          </header>
          


         

      {/* Search + Sort */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex items-center gap-3 w-full md:w-2/3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product..." className="w-full md:w-2/3 border p-2 rounded-lg shadow-sm" />

            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="border p-2 rounded-lg bg-white">
              <option value="default">Sort By</option>
              <option value="price-low">Price — Low to High</option>
              <option value="price-high">Price — High to Low</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
            Showing <b>{totalItems}</b> items | Page <b>{page}</b> / <b>{totalPages}</b>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mt-4 overflow-auto">
          <div className="flex gap-3">
            {CATEGORIES.map((cat) => {
              const active = cat === activeCategory;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-sm border ${active ? "bg-gray-800 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <main className="max-w-6xl mx-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <ShimmerCard key={i} />)
          : paginated.map((p) => {
              const inCart = cart.find((c) => c.id === p.id);
              const priceNum = Number(p.price || 0);
              const discounted = getDiscountedPrice(p);

              return (
                <div key={p.id} className="bg-white rounded-2xl shadow hover:shadow-md transition p-3 flex flex-col items-center relative">
                  <div className="w-full h-40 rounded-lg overflow-hidden mb-2">
                    <img src={p.image_url || "/no-image.png"} alt={p.name} className="w-full h-full object-cover cursor-pointer" onClick={() => setSelectedImage(p.image_url || null)} />
                  </div>

                  <h3 className="font-semibold text-center truncate w-full">{p.name}</h3>
                  <p className="text-xs text-gray-500 mb-1">{p.category || "-"}</p>

                  {/* Price Section */}
                  <div className="mt-1 mb-2 text-center">
                    {Number(p.discount_percent) > 0 ? (
                      <div>
                        <div className="text-sm">
                          <span className="line-through text-gray-400 mr-2">₹{priceNum}</span>
                          <span className="font-semibold text-green-700">₹{discounted}</span>
                        </div>
                        <div className="text-xs text-green-600">Save {p.discount_percent}%</div>
                      </div>
                    ) : (
                      <div className="text-gray-700 font-semibold">₹{priceNum}</div>
                    )}

                    <div className="text-xs text-gray-500">Min Qty: {p.min_qty ?? 1}</div>
                  </div>

                  {/* Countdown (only if enabled) */}
                  <CountdownTimer countdownEnabled={Boolean(p.countdown_enabled)} countdownTime={p.countdown_time || undefined} saleEndDate={p.sale_end_date || undefined} id={p.id} />

                  {/* Cart Buttons */}
                  {!inCart ? (
                    <button onClick={() => addToCart(p)} className="bg-green-600 text-white w-full py-1.5 rounded-lg hover:bg-green-700 text-sm">
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-3 mt-1">
                      <button onClick={() => updateQty(p.id, "remove")} className="bg-red-500 text-white w-8 h-8 rounded-full">−</button>
                      <span className="font-semibold">{inCart.qty}</span>
                      <button onClick={() => updateQty(p.id, "add")} className="bg-green-600 text-white w-8 h-8 rounded-full">+</button>
                    </div>
                  )}
                </div>
              );
            })}
      </main>

      {/* Pagination */}
      {!loading && totalItems > 0 && (
        <div className="max-w-6xl mx-auto p-4">
           <div className="flex items-center justify-center gap-2 overflow-x-auto whitespace-nowrap py-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-2 py-0.5 text-[10px] rounded border bg-white shrink-0">
            Prev
          </button>
        <div className="flex gap-1 overflow-x-auto max-w-[220px] px-1 scrollbar-hide">
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            return (
              <button key={n} onClick={() => setPage(n)} className={`px-1.5 py-0.5 rounded ${n === page ? "bg-gray-800 text-white" : "border"}`}>
                {n}
              </button>
            );
          })}
          </div>

          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 py-0.5 text-[10px] rounded border bg-white shrink-0">
            Next
          </button>
        </div>
        </div>
      )}

      {error && (
        <div className="max-w-6xl mx-auto p-4 text-red-600">
          Error: {error}
        </div>
      )}

      {/* WhatsApp Floating Button */}
      {cart.length > 0 && (
        <button onClick={sendOnWhatsApp} className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg z-30">
          📲 Send Order on WhatsApp ({cart.length})
        </button>
        

      )}

      {/* Image Modal */}
      {selectedImage && (
        <div onClick={() => setSelectedImage(null)} className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-40">
          <img src={selectedImage} alt="Full" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-lg" />
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white w-[90%] max-w-md rounded-2xl p-5 shadow-lg relative">
            <h2 className="text-lg font-bold text-center">🛍️ Your Cart</h2>

            {cart.length === 0 ? (
              <p className="text-center text-gray-500 mt-3">Cart is empty.</p>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto space-y-3 mt-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, "remove")} className="bg-red-500 text-white w-8 h-8 rounded-full">−</button>
                      <span className="font-semibold">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, "add")} className="bg-green-600 text-white w-8 h-8 rounded-full">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-4">
              <button onClick={() => setShowCart(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">
                Close
              </button>

              {cart.length > 0 && (
                <button onClick={sendOnWhatsApp} className="bg-green-600 text-white px-4 py-2 rounded-lg">
                  Send on WhatsApp
                </button>
                
              )}
            </div>
          </div>
        </div>
      )}
      {preparing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white px-6 py-4 rounded-lg shadow-lg text-center">
            <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-green-600 rounded-full mx-auto mb-3"></div>
            <p className="text-sm font-semibold">Preparing your WhatsApp message...</p>
          </div>
        </div>
      )}

    </div>
  );
}

