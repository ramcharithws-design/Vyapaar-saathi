import { detectIntent } from "../../lib/groq";
import { textToSpeech } from "../../lib/murf";
import {
  recordSale, recordExpense,
  deleteSale, deleteExpense,
  clearAllSales, clearAllExpenses,
  getCustomerHistory,
  getDailySummary, getWeeklyReport
} from "../../lib/supabase";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { transcript, languageCode, token } = req.body;
  if (!transcript || !languageCode) return res.status(400).json({ error: "Missing fields" });

  // Get authenticated user
  let userId = null;
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    userId = user?.id || null;
  }

  try {
    const intentResponse = await detectIntent(transcript, languageCode);
    if (!intentResponse.success) return res.status(500).json({ error: "Could not understand" });

    const { intent, data, reply, language } = intentResponse.result;
    let finalReply = reply;
    let actionSuccess = true;

    if (intent === "RECORD_SALE") {
      await recordSale(data, language, userId);
    }

    else if (intent === "TRACK_EXPENSE") {
      await recordExpense(data, language, userId);
    }

    else if (intent === "DELETE_SALE") {
      const deleted = await deleteSale(data.deleteItem, userId);
      if (!deleted) finalReply = `"${data.deleteItem}" ki sale nahi mili. Dobara check karein.`;
    }

    else if (intent === "DELETE_EXPENSE") {
      const deleted = await deleteExpense(data.deleteItem, userId);
      if (!deleted) finalReply = `"${data.deleteItem}" ka expense nahi mila. Dobara check karein.`;
    }

    else if (intent === "CLEAR_SALES") {
      await clearAllSales(userId);
    }

    else if (intent === "CLEAR_EXPENSES") {
      await clearAllExpenses(userId);
    }

    else if (intent === "CUSTOMER_HISTORY") {
      const history = await getCustomerHistory(data.customerName, userId);
      if (history) {
        const total = history.transactions.reduce((sum, t) => sum + t.amount, 0);
        finalReply = `${history.customer.name} ke saath ${history.transactions.length} transactions hain. Total amount: ₹${total}.`;
      } else {
        finalReply = `${data.customerName} ka koi record nahi mila.`;
      }
    }

    else if (intent === "DAILY_SUMMARY") {
      const s = await getDailySummary(userId);
      finalReply = `Aaj ka hisaab: Sales ₹${s.totalSales}, Expenses ₹${s.totalExpenses}, Net Profit ₹${s.profit}.`;
    }

    else if (intent === "VOICE_REPORT") {
      const r = await getWeeklyReport(userId);
      finalReply = `Is hafte ${r.salesCount} sales hue. Total sales ₹${r.totalSales}, Expenses ₹${r.totalExpenses}, Profit ₹${r.profit}.`;
    }

    const tts = await textToSpeech(finalReply, languageCode);

    return res.status(200).json({
      success: true,
      intent,
      reply: finalReply,
      audio: tts.audio || null,
      language: languageCode
    });

  } catch (error) {
    console.error("Voice API error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
