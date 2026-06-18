import { useState, useRef } from "react";
import { collection, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore";
import Tesseract from "tesseract.js";
import {
  LayoutDashboard, FileText, UploadCloud, Plane, Navigation,
  Clock, AlertTriangle, XCircle, User, CheckCircle
} from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Input, Select } from "../components/Input";
import { Button } from "../components/Button";

function MiscClaim() {
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [remark, setRemark] = useState("");
  const [customerCover, setCustomerCover] = useState("No");
  const [amount, setAmount] = useState("");
  const [ocrAmount, setOcrAmount] = useState(null);

  const [isScanning, setIsScanning] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setReceiptFile(file);
    setReceiptImage(URL.createObjectURL(file));
    setIsScanning(true);

    try {
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m) => console.log(m),
      });

      const text = result.data.text;
      console.log("OCR Extracted Text:", text);

      // Simple regex to find the largest currency-like number
      const numbers = text.match(/\d+(\.\d{1,2})?/g);
      if (numbers && numbers.length > 0) {
        // Convert to floats and find max (usually the total)
        const maxAmount = Math.max(...numbers.map(n => parseFloat(n)));
        if (!isNaN(maxAmount) && maxAmount > 0) {
          const formatted = maxAmount.toFixed(2);
          setAmount(formatted);
          setOcrAmount(formatted);
          alert(`OCR detected total amount: ₹${formatted}`);
        } else {
          alert("OCR could not confidently find a total amount. Please enter it manually.");
        }
      } else {
        alert("OCR could not find any numbers. Please enter amount manually.");
      }
    } catch (error) {
      console.error("OCR Error:", error);
      alert("Failed to scan receipt.");
    } finally {
      setIsScanning(false);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800; // Cap width to keep size small for Firestore (<1MB)
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to 60% quality JPEG
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const submitMiscClaim = async () => {
    if (!category || !amount) {
      alert("Please fill required fields (Category and Amount).");
      return;
    }

    try {
      const uid = localStorage.getItem("uid");
      const userDoc = await getDoc(doc(db, "user", uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      const claimId = `MSC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Use Base64 compression instead of Firebase Storage!
      let receiptDataUrl = null;
      if (receiptFile) {
        receiptDataUrl = await compressImage(receiptFile);
      }

      const isFlagged = ocrAmount !== null && parseFloat(amount) !== parseFloat(ocrAmount);
      const flagReason = isFlagged ? `Amount mismatch (OCR: ₹${ocrAmount}, Entered: ₹${amount})` : "";

      await addDoc(collection(db, "miscClaims"), {
        claimId,
        claimType: "MISCELLANEOUS",
        employeeUid: uid || "",
        employeeName: userData.name || "",
        employeeId: userData.employeeId || "",
        managerId: userData.managerId || "",
        agencyName: userData.agencyName || "",
        baseRegion: userData.baseRegion || "",
        baseLocation: userData.baseLocation || "",
        agencyFee: userData.agencyFee || 0,
        category,
        subCategory,
        remark,
        customerCover,
        claimAmount: parseFloat(amount),
        requestStatus: "CLAIM_PENDING_APPROVAL", // Goes straight to approval
        hasReceipt: !!receiptImage,
        receiptUrl: receiptDataUrl, // Saving compressed Base64 directly to Firestore!
        isFlagged,
        flagReason,
        createdAt: serverTimestamp(),
      });

      alert(`Miscellaneous Claim Submitted!\nClaim ID: ${claimId}`);
      setCategory("");
      setSubCategory("");
      setRemark("");
      setCustomerCover("No");
      setAmount("");
      setOcrAmount(null);
      setReceiptImage(null);
      setReceiptFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error) {
      console.log(error);
      alert(error.message);
    }
  };

  const menuItems = [
    { text: "Dashboard", path: "/l0", icon: <LayoutDashboard size={20} /> },
    { text: "Travel Claim", path: "/travel-claim", icon: <Plane size={20} /> },
    { text: "Active Travels", path: "/active-travels", icon: <Navigation size={20} /> },
    { text: "Miscellaneous Claim", path: "/misc-claim", icon: <FileText size={20} /> },
    { text: "Previous Claims", path: "/previous-claims", icon: <Clock size={20} /> },
    { text: "Flagged Claims", path: "/flagged-claims", icon: <AlertTriangle size={20} /> },
    { text: "Rejected Claims", path: "/rejected-claims", icon: <XCircle size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title">Miscellaneous Claim</h1>
        <p className="page-subtitle">Submit non-travel expenses (Tolls, Hotel, Material). Upload receipt for auto-scan.</p>

        <div className="glass-panel" style={{ padding: "30px", maxWidth: "700px" }}>

          {/* OCR Upload Section */}
          <div style={{
            border: "2px dashed var(--primary-color)",
            borderRadius: "12px",
            padding: "30px",
            textAlign: "center",
            marginBottom: "24px",
            background: "rgba(99, 102, 241, 0.05)",
            cursor: "pointer",
            position: "relative"
          }} onClick={() => fileInputRef.current?.click()}>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
            {isScanning ? (
              <div style={{ color: "var(--primary-color)" }}>
                <div className="spinner" style={{ margin: "0 auto 10px auto", width: "30px", height: "30px", border: "3px solid rgba(99,102,241,0.3)", borderTop: "3px solid var(--primary-color)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                <p>Scanning Receipt with OCR...</p>
              </div>
            ) : receiptImage ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <img src={receiptImage} alt="Receipt" style={{ maxHeight: "150px", borderRadius: "8px" }} />
                <p style={{ color: "var(--success)", display: "flex", alignItems: "center", gap: "5px" }}><CheckCircle size={16} /> Receipt Scanned</p>
                <p className="text-secondary" style={{ fontSize: "0.85rem" }}>Click to upload a different receipt</p>
              </div>
            ) : (
              <div>
                <UploadCloud size={40} color="var(--primary-color)" style={{ margin: "0 auto 10px auto" }} />
                <h3 style={{ color: "var(--text-primary)", marginBottom: "5px" }}>Upload Receipt Image</h3>
                <p className="text-secondary" style={{ fontSize: "0.9rem" }}>PNG, JPG up to 5MB. AI will auto-detect the amount.</p>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Select label="Claim Category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select Category</option>
              <option value="Toll Tax">Toll Tax</option>
              <option value="Parking">Parking</option>
              <option value="Hotel Stay">Hotel Stay</option>
              <option value="Material Purchase">Material Purchase</option>
              <option value="Other">Other</option>
            </Select>

            <Input label="Sub Category" placeholder="e.g. NH-44 Toll" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} />

            <Select label="Will Cover With Customer?" value={customerCover} onChange={(e) => setCustomerCover(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </Select>

            <Input label="Total Amount (₹)" type="number" placeholder="Auto-filled by OCR" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <Input label="Remark" placeholder="Optional details about this expense..." value={remark} onChange={(e) => setRemark(e.target.value)} />

          <Button onClick={submitMiscClaim} style={{ marginTop: "20px", width: "100%" }}>
            <FileText size={18} /> Submit Miscellaneous Claim
          </Button>
        </div>
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default MiscClaim;
