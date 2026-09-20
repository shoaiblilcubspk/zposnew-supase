import React from 'react';
import { BookOpen, ShoppingCart, Package, Users, Truck, PieChart, Shield } from 'lucide-react';

export function HowToUse() {
  const sections = [
    {
      title: "1. POS & Sales (Point of Sale)",
      icon: <ShoppingCart className="h-5 w-5 text-emerald-500" />,
      urdu: "پوائنٹ آف سیل دکان کا مین کاؤنٹر ہے جہاں سے بل بنتے ہیں۔ یہاں آپ بارکوڈ اسکین کرتے ہیں یا آئٹم سیلیکٹ کرتے ہیں۔ سسٹم خودکار طریقے سے ٹیکس اور ڈسکاؤنٹ کیلکولیٹ کرتا ہے۔ بل ادا کرتے وقت کیش، کارڈ، آن لائن اور کریڈٹ (ادھار) کے آپشنز ہوتے ہیں۔ آپ ایک ہی بل کو مختلف والٹس میں (Split) بھی کر سکتے ہیں۔",
      roman: "POS dukan ka main counter hai jahan se bills bante hain. Yahan aap barcode scan karte hain. System automatically tax aur discount calculate karta hai. Bill pay karte waqt Cash, Card, Online aur Credit (Udhaar) ke options hote hain. Aap ek hi bill ko split bhi kar sakte hain.",
      example: "Ali ne 1500 Rs ka bill banwaya, 1000 Rs Cash diye aur 500 Rs Credit (Udhaar) karwa liye. System inventory se stock minus karega, Cash Wallet mein 1000 add karega aur Ali ke khate mein 500 Rs ka udhaar dal dega."
    },
    {
      title: "2. Inventory & Stock Management",
      icon: <Package className="h-5 w-5 text-blue-500" />,
      urdu: "انوینٹری گودام کا حساب رکھتی ہے۔ ہر آئٹم کی نقل و حرکت 'اسٹاک ہسٹری' میں ریکارڈ ہوتی ہے۔ اگر اسٹاک زیرو ہو جائے تو سسٹم سیل روک دیتا ہے، لیکن اگر مالک چاہے تو سیٹنگز سے 'اوور سیلنگ' آن کر سکتا ہے۔",
      roman: "Inventory godaam ka hisaab rakhti hai. Har item ki movement 'Stock History' mein record hoti hai. Agar stock zero ho jaye tou system sale rok deta hai, lekin owner chahay tou 'Overselling' allow kar sakta hai.",
      example: "Aapne KFC Deal (Burger + Pepsi) sale ki. System background mein automatic dono items ka stock minus kar dega."
    },
    {
      title: "3. Customers & CRM (Udhaar Khata)",
      icon: <Users className="h-5 w-5 text-purple-500" />,
      urdu: "یہاں کسٹمرز کے ادھار کا حساب رکھا جاتا ہے۔ آپ ہر کسٹمر کی ایک 'کریڈٹ لمیٹ' سیٹ کر سکتے ہیں۔ جب کسٹمر ادھار لیتا ہے تو اس کا بیلنس (Debit) بڑھتا ہے، اور جب وہ ادائیگی کرتا ہے تو بیلنس (Credit) کم ہوتا ہے۔",
      roman: "Yahan customers ke udhaar ka hisaab rakha jata hai. Jab customer udhaar leta hai tou us ka balance (Debit) barhta hai, aur jab payment karta hai tou balance (Credit) kam hota hai.",
      example: "Raza ka 2000 Rs udhaar تھا. Usne 1500 Rs pay kiye. System ne uska baqiya udhaar 500 Rs kar diya aur 1500 Rs aapke Wallet mein daal diye."
    },
    {
      title: "4. Suppliers & Purchases",
      icon: <Truck className="h-5 w-5 text-orange-500" />,
      urdu: "یہ سپلائرز سے خریدے گئے مال کا کھاتہ ہے۔ جب آپ مال وصول کرتے ہیں تو انوینٹری بڑھتی ہے اور سپلائر کے کھاتے میں بل (Credit) بن جاتا ہے۔ جب آپ اسے پیمنٹ کرتے ہیں تو قرضہ کم ہو جاتا ہے۔",
      roman: "Ye suppliers se kharide gaye maal ka khata hai. Jab aap maal receive karte hain tou inventory barhti hai aur supplier ke khate mein bill (Credit) ban jata hai.",
      example: "Nestle se 10,000 Rs ka maal aaya. Aapne 5,000 Rs ada kiye. System ne stock add kiya aur supplier ke khate mein 5,000 Rs ka baqiya karza show kar diya."
    },
    {
      title: "5. Financial Reports & Wallets",
      icon: <PieChart className="h-5 w-5 text-pink-500" />,
      urdu: "یہ ڈیش بورڈ آپ کی اصل سیل اور لاگت (COGS) کا حساب لگا کر آپ کو خالص منافع (Net Profit) بتاتا ہے۔ اس کے علاوہ ہر والیٹ کا بیلنس الگ الگ ظاہر ہوتا ہے تاکہ رات کو گلے کا کیش ٹیلی کیا جا سکے۔",
      roman: "Ye dashboard aapki asal sale aur laagat (Cost) ka hisaab laga kar Net Profit batata hai. Har wallet (Cash, Card) ka hisaab alag alag show hota hai.",
      example: "Din mein 50,000 Rs ki sale hui, jis mein 30,000 Cash tha aur 20,000 udhaar. Cash Wallet mein sirf 30,000 show honge aur 20,000 Credit Wallet mein jayenge."
    },
    {
      title: "6. Roles & Permissions",
      icon: <Shield className="h-5 w-5 text-red-500" />,
      urdu: "سسٹم میں کیشیئر، مینیجر اور ایڈمن کے رولز ہیں۔ کیشیئر صرف بل بنا سکتا ہے۔ کسی بھی سیل کو ڈیلیٹ کرنے یا سیٹنگز بدلنے کے لیے ایڈمن کا پاسورڈ (PIN) درکار ہوتا ہے۔",
      roman: "System mein Cashier, Manager aur Admin ke roles hain. Cashier sirf bill bana sakta hai. Sale delete karne ke liye Admin ki permission/PIN chahiye hota hai.",
      example: "Agar cashier ghalti se bill bana de aur usay delete karna chahay, tou system delete nahi karega jab tak Admin apna PIN na dale."
    }
  ];

  return (
    <div className="space-y-4 w-full pb-16 text-[13px] tracking-[-0.01em]">
      <div className="bg-white dark:bg-surface rounded-md p-4 sm:p-5 border border-neutral-200 dark:border-white/[0.08] shadow-none flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-tight">
              Zaynahs POS Guide & Documentation
            </h2>
            <p className="text-[12px] text-neutral-500 font-mono mt-0.5">
              Operating principles, workflow rules, and real-world examples.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white dark:bg-surface rounded-md p-4 sm:p-5 border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-3">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-neutral-200 dark:border-white/[0.08]">
              {section.icon}
              <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white">{section.title}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 bg-neutral-50 dark:bg-app p-3 rounded border border-neutral-200 dark:border-white/[0.08]">
                <p className="text-[10px] font-mono uppercase text-neutral-500 tracking-wider">Roman Urdu</p>
                <p className="text-[12px] text-neutral-700 dark:text-neutral-300 leading-relaxed">{section.roman}</p>
              </div>
              <div className="space-y-1 bg-neutral-50 dark:bg-app p-3 rounded border border-neutral-200 dark:border-white/[0.08]" dir="rtl">
                <p className="text-[10px] font-mono uppercase text-neutral-500 tracking-wider text-left" dir="ltr">Urdu Script</p>
                <p className="text-[13px] text-neutral-800 dark:text-neutral-200 leading-loose font-noto">{section.urdu}</p>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-3 rounded flex gap-2.5 items-start">
              <span className="text-[13px]">💡</span>
              <div>
                <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-0.5">Example Workflow</p>
                <p className="text-[12px] text-neutral-700 dark:text-neutral-300">{section.example}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
