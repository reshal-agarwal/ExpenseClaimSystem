import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const runEscalationEngine = async () => {
  try {
    console.log("[Escalation Engine] Starting background scan...");
    let escalatedCount = 0;

    // We scan both travel and misc claims
    const collectionsToScan = ["travelRequests", "miscClaims"];

    for (const colName of collectionsToScan) {
      const q = query(
        collection(db, colName),
        where("requestStatus", "==", "CLAIM_PENDING_APPROVAL")
      );

      const snapshot = await getDocs(q);
      const now = new Date();

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let submissionTime = null;

        // Travel claims use endTime as submission to L1, Misc use createdAt
        if (colName === "travelRequests" && data.endTime) {
          submissionTime = data.endTime.toDate();
        } else if (data.createdAt) {
          submissionTime = data.createdAt.toDate();
        }

        if (submissionTime) {
          const hoursDiff = (now - submissionTime) / (1000 * 60 * 60);

          // If more than 69 hours have passed (45h reminder + 24h grace)
          if (hoursDiff >= 69) {
            await updateDoc(doc(db, colName, docSnap.id), {
              requestStatus: "ESCALATED_TO_L2",
              escalatedAt: serverTimestamp(),
              flagReason: data.flagReason ? `${data.flagReason} | Escalated due to L1 timeout` : "Escalated due to L1 timeout",
            });
            escalatedCount++;
            console.log(`[Escalation Engine] Escalated ${docSnap.id} to L2.`);
          }
        }
      }
    }

    if (escalatedCount > 0) {
      console.log(`[Escalation Engine] Scan complete. Escalated ${escalatedCount} abandoned claims.`);
    } else {
      console.log("[Escalation Engine] Scan complete. No claims to escalate.");
    }

  } catch (error) {
    console.error("[Escalation Engine] Error running engine:", error);
  }
};
