import * as dotenv from 'dotenv';
// كنجيبو الدالة اللي كتنشر الأخبار من الملف الرئيسي ديالك
import { runBotCycle } from './server.ts'; 

dotenv.config();

async function startAction() {
  console.log("🚀 Starting AL MYDAN Bot via GitHub Actions...");
  
  try {
    // كنشغلو البوت باش يجيب الخبر وينشرو
    await runBotCycle(); 
    
    console.log("✅ Posting process finished successfully!");
    
    // كنسدو السكريبت باش GitHub Actions يعرف بلي الخدمة سالات
    process.exit(0); 
    
  } catch (error) {
    console.error("❌ Error occurred during bot execution:", error);
    process.exit(1); // إيلا وقع شي خطأ كيخلي العلامة تولي حمرا فـ GitHub
  }
}

// تشغيل الفانكشن
startAction();

