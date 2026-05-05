import { motion } from "motion/react";
import { BookOpen, ChefHat, Info, ArrowRight, Bookmark, Star, ChevronRight, PlayCircle } from "lucide-react";
import { useState } from "react";
import api from "../api";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  pageBg:       "#f4f6f2",
  heroBg:       "#eef3eb",
  heroBorder:   "#d8e5d2",
  cardBg:       "#ffffff",
  cardBorder:   "#e8ede5",
  cardShadow:   "0 2px 10px rgba(60,80,60,0.07)",
  textPrimary:  "#2a3628",
  textBody:     "#526155",
  textMuted:    "#8da48f",
  green:        "#3e7055",
  greenDark:    "#2d6a4f",
  greenLight:   "#eaf2ec",
  greenMid:     "#5a9470",
  sectionBg:    "#f3f0ea",
};
const font = "'Segoe UI', system-ui, -apple-system, sans-serif";

// ── Real producers from our database ─────────────────────────────────────────
const farmers = [
  {
    id: 76,
    role: "ORGANIC VEGETABLE GROWER",
    name: "Green Valley Farm",
    subtitle: "Daniel & Priya Fletcher",
    description:
      "Four generations of organic farming on 38 Bristol acres. Hand-picked produce delivered within 24 hours of harvest — winner of the Soil Association's Farm of the Year 2021.",
    image: "https://images.pexels.com/photos/4918088/pexels-photo-4918088.jpeg?auto=compress&cs=tinysrgb&w=800",
    heroImage: "https://images.pexels.com/photos/5727780/pexels-photo-5727780.jpeg?auto=compress&cs=tinysrgb&w=1200",
    location: "Henbury, Bristol, BS10 7QR",
    farmSize: "38 Acres",
    primaryCrops: "Organic Vegetables, Seasonal Fruits",
    quote: "Healthy soil grows healthy food, and healthy food builds healthy communities.",
    fullStory:
      "Green Valley Farm has been in the Fletcher family for four generations, stretching back to 1947 when Thomas Fletcher first broke ground on 12 acres of Bristol hillside.\n\nWhat started as a mixed livestock farm gradually transformed into one of the region's most respected organic growing operations. In 1989, Thomas's daughter Ruth made the bold decision to transition fully to organic methods — at a time when the word 'organic' was barely understood by most consumers.\n\nToday, Ruth's son Daniel runs the farm alongside his partner Priya, cultivating over 60 varieties of vegetables and fruit across 38 acres. They were awarded the Soil Association's Farm of the Year in 2021 and supply produce to the Bristol Regional Food Network as a founding member.\n\nTheir philosophy is simple: healthy soil grows healthy food, and healthy food builds healthy communities. Every seed they plant is chosen for flavour, not shelf life.",
  },
  {
    id: 77,
    role: "MASTER BAKER",
    name: "Bristol Artisan Bakery",
    subtitle: "Marco Silva",
    description:
      "Born in a Stokes Croft railway arch in 2011 with a 200-year-old Portuguese sourdough starter. Stone-milled heritage wheat, 18-hour fermentation — nothing rushed, nothing frozen.",
    image: "https://images.pexels.com/photos/6280396/pexels-photo-6280396.jpeg?auto=compress&cs=tinysrgb&w=800",
    heroImage: "https://images.pexels.com/photos/3893535/pexels-photo-3893535.jpeg?auto=compress&cs=tinysrgb&w=1200",
    location: "Stokes Croft, Bristol, BS1 3PR",
    farmSize: "Urban Bakehouse",
    primaryCrops: "Sourdough Breads, Croissants, Seasonal Pastries",
    quote: "Nothing is rushed. Nothing is frozen. Every loaf that leaves the bakery was made by hand that morning.",
    fullStory:
      "Bristol Artisan Bakery was born in a tiny railway arch in Stokes Croft in 2011, when head baker Marco Silva left a Michelin-starred London restaurant to pursue something more meaningful.\n\nArmed with a 200-year-old sourdough starter he carried from Portugal in a jam jar, Marco began baking 40 loaves a night and selling them at St Nicholas Market every Saturday. The queues grew so long that within two years he had outgrown the arch and moved to a purpose-built bakehouse on Stokes Croft.\n\nToday the team of seven bakers still begins work at 3am, slow-fermenting every loaf for a minimum of 18 hours. All flour is stone-milled from heritage wheat varieties grown in Wiltshire, and Marco personally visits the mill twice a year to select each batch.\n\nNothing is rushed. Nothing is frozen. Every loaf that leaves the bakery was made by hand that morning — because Marco believes you can taste the difference, and so do we.",
  },
  {
    id: 78,
    role: "DAIRY FARMER",
    name: "Meadow Dairy Co",
    subtitle: "Dr. Claire Ashton",
    description:
      "Unhomogenised milk and artisan cheeses from 80 free-range Brown Swiss cows on the Bristol edge. 23 national awards — milked just once a day for a calmer, richer result.",
    image: "https://images.pexels.com/photos/6525832/pexels-photo-6525832.jpeg?auto=compress&cs=tinysrgb&w=800",
    heroImage: "https://images.pexels.com/photos/7673830/pexels-photo-7673830.jpeg?auto=compress&cs=tinysrgb&w=1200",
    location: "Lawrence Weston, Bristol, BS11 0LP",
    farmSize: "90 Acres",
    primaryCrops: "Whole Milk, Artisan Cheese, Free-Range Eggs",
    quote: "When you taste milk from cows that are never stressed and always on pasture, you understand immediately.",
    fullStory:
      "Meadow Dairy Co was established in 2003 by veterinarian Dr. Claire Ashton, who left her practice after becoming frustrated watching industrial dairy operations prioritise output over animal welfare.\n\nShe purchased a neglected 90-acre farm on the Bristol edge, restored the meadows using traditional hay-making and wildflower seeding, and introduced a small herd of Brown Swiss cattle — a heritage breed known for rich, high-protein milk.\n\nClaire's approach is radical by modern dairy standards: the cows are never housed overnight between April and October, calves are raised alongside their mothers for the first six months, and milking happens just once a day to reduce stress on the herd.\n\nThe cheese operation began almost by accident — a surplus of summer milk led Claire to experiment with a soft Camembert-style recipe, which promptly won a gold medal at the British Cheese Awards. That was 2009. Since then, Meadow Dairy has won 23 national awards and supplies some of Bristol's finest restaurants.",
  },
  {
    id: 81,
    role: "HERITAGE ORCHARD KEEPER",
    name: "Wye Valley Orchard",
    subtitle: "Huw Griffiths",
    description:
      "80+ varieties of pre-Victorian fruit on ancient limestone soils just outside Bristol. No sprays, no shortcuts — just patience, rainfall, and 100 years of orchard wisdom.",
    image: "https://images.pexels.com/photos/35389351/pexels-photo-35389351.jpeg?auto=compress&cs=tinysrgb&w=800",
    heroImage: "https://images.pexels.com/photos/7457529/pexels-photo-7457529.jpeg?auto=compress&cs=tinysrgb&w=1200",
    location: "Long Ashton, Bristol, BS41 9DP",
    farmSize: "Heritage Orchard",
    primaryCrops: "Heritage Apples, Pears, Cherries, Plums",
    quote: "The orchard teaches me something new every year — and I've been listening carefully for the past 16.",
    fullStory:
      "Wye Valley Orchard was established in 1923 by the Griffiths family on a south-facing limestone escarpment just outside Bristol. The farm passed through four generations before arriving with current owner Huw Griffiths in 2008, who made the bold decision to abandon commercial apple varieties entirely and return the orchard to its heritage roots.\n\nToday, Huw tends over 80 varieties of fruit — many of them pre-Victorian cultivars that had almost vanished from British agriculture. You'll find names like 'Slack-ma-Girdle', 'Foxwhelp', and 'Chisel Jersey' alongside better-known varieties.\n\nNothing is sprayed. Nothing is forced. The orchard runs on patience, rainfall, and the same limestone soil that has been feeding fruit trees here for over a century.\n\nHuw says the orchard teaches him something new every year — and he's been listening carefully for the past 16.",
  },
  {
    id: 79,
    role: "SUSTAINABLE FISHERMAN",
    name: "Harbour Fresh Seafood",
    subtitle: "Joe & Sam Trevithick",
    description:
      "Day-boat fish and shellfish landed fresh at Avonmouth and delivered the same morning. Sustainably caught using traditional line and pot methods — never trawled.",
    image: "https://images.pexels.com/photos/5673667/pexels-photo-5673667.jpeg?auto=compress&cs=tinysrgb&w=800",
    heroImage: "https://images.pexels.com/photos/5673667/pexels-photo-5673667.jpeg?auto=compress&cs=tinysrgb&w=1200",
    location: "Avonmouth, Bristol, BS11 9YA",
    farmSize: "2 Day Boats",
    primaryCrops: "Sea Bass, Crab, Mackerel, Shellfish",
    quote: "The sea gives us everything. The least we can do is take care of it.",
    fullStory:
      "Harbour Fresh was founded in 2016 by brothers Joe and Sam Trevithick, third-generation fishermen whose grandfather first worked the Bristol Channel in the 1960s on a wooden day-boat named The Margery.\n\nAfter years of watching large trawlers devastate local fish populations, Joe and Sam decided to do things differently. They operate two small vessels — The Margery II and The Saltwater — using only hand lines, crab pots, and sustainable gill nets that are checked daily.\n\nEvery species they catch is assessed against the Marine Conservation Society's Good Fish Guide before it joins their range. On days when the catch doesn't meet their standards, they don't sell. Simple as that.\n\nThe brothers expanded into home delivery in 2019 after Bristol customers kept asking where they could buy the same fish the restaurants were getting. Today they deliver across the Bristol postcode area by 9am, with the fish having been in the water less than 12 hours earlier.",
  },
  {
    id: 80,
    role: "MASTER BUTCHER",
    name: "Bristol Quality Meats",
    subtitle: "Imogen Harding",
    description:
      "Traditionally reared beef, lamb, and chicken from named farms. Dry-aged on-site for a minimum of 28 days on Whiteladies Road, Clifton. No shortcuts, no compromises since 1978.",
    image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=500&q=80",
    heroImage: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=1200&q=80",
    location: "Clifton, Bristol, BS8 2NT",
    farmSize: "Clifton High Street",
    primaryCrops: "Beef, Lamb, Free-Range Chicken, Pork",
    quote: "Know where every animal comes from, how it was raised, and what it ate. Everything else follows.",
    fullStory:
      "Bristol Quality Meats has been a fixture on Whiteladies Road since 1978, when master butcher Roy Harding opened the shop with £800 in savings and a firm handshake agreement with two Bristol-area farmers.\n\nNearly five decades later, Roy's granddaughter Imogen runs the business with the same philosophy: know exactly where every animal comes from, how it was raised, and what it ate.\n\nEvery farm that supplies Bristol Quality Meats is visited in person at least twice a year. Imogen refuses to stock anything from operations she wouldn't be comfortable showing to a customer.\n\nAll beef is dry-aged for a minimum of 28 days in their on-site Himalayan salt chamber — a method that concentrates flavour and tenderises the meat naturally without any additives. The chicken comes exclusively from a single farm where birds are slow-grown over 81 days and spend their lives on pasture.",
  },
  {
    id: 82,
    role: "HERB & FLOWER GROWER",
    name: "Somerset Herb Garden",
    subtitle: "Amara Osei",
    description:
      "120+ varieties of culinary herbs, salad leaves, and edible flowers. Cut to order from St George, Bristol and delivered the same day — because Amara believes a herb picked this morning tastes completely different.",
    image: "https://images.pexels.com/photos/4750371/pexels-photo-4750371.jpeg?auto=compress&cs=tinysrgb&w=800",
    heroImage: "https://images.pexels.com/photos/4750371/pexels-photo-4750371.jpeg?auto=compress&cs=tinysrgb&w=1200",
    location: "St George, Bristol, BS5 9RD",
    farmSize: "2 Acres",
    primaryCrops: "Culinary Herbs, Edible Flowers, Salad Leaves",
    quote: "A herb that was in the ground this morning tastes completely different from one that's been in a plastic bag for a week.",
    fullStory:
      "Somerset Herb Garden was founded in 2014 by former chef Amara Osei, who spent fifteen years cooking in restaurant kitchens across Europe before deciding she was tired of working with herbs that had travelled further than she had.\n\nShe returned to Bristol — where she grew up — and converted a two-acre market garden in St George into one of the most diverse herb growing operations in the South West.\n\nAmara grows over 120 varieties of culinary herbs, salad leaves, and edible flowers, many of them rare cultivars she sources from specialist seed libraries in France and Italy. Everything is cut to order, meaning nothing sits in cold storage.\n\nChefs across Bristol have told her they can taste the difference — and so can home cooks. 'A herb that was in the ground this morning tastes completely different from one that's been in a plastic bag for a week,' she says. 'Once you know that, you can't go back.'",
  },
  {
    id: 83,
    role: "BEEKEEPER & PRESERVES MAKER",
    name: "Mendip Hive & Preserves",
    subtitle: "Margaret Vowles",
    description:
      "Raw wildflower honey from 24 hives across Bristol's green spaces, and small-batch preserves made from fruit grown within 10 miles. No artificial pectin, no mass production.",
    image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=500&q=80",
    heroImage: "https://images.pexels.com/photos/5855875/pexels-photo-5855875.jpeg?auto=compress&cs=tinysrgb&w=1200",
    location: "Redland, Bristol, BS6 6TH",
    farmSize: "24 Hives",
    primaryCrops: "Wildflower Honey, Fruit Preserves, Seasonal Jams",
    quote: "A good jam should taste of the fruit. If you have to read the ingredients to understand what's in it, something has gone wrong.",
    fullStory:
      "Mendip Hive & Preserves began with a single beehive in a Redland back garden in 2007. Its owner, retired schoolteacher Margaret Vowles, started keeping bees as a retirement hobby and quickly became obsessed.\n\nBy 2012 she had 24 hives spread across Bristol's parks and green spaces, each positioned to take advantage of different wildflower patches — from the meadows of Leigh Woods to the allotments of Bishopston.\n\nThe honey from each site tastes completely different, and Margaret sells them separately so customers can compare.\n\nThe preserves operation came later, born out of a need to use surplus fruit from neighbouring gardens and allotments that would otherwise go to waste. Margaret makes every jar herself using fruit harvested within 10 miles of her home, and she refuses to use commercial pectin or artificial setting agents.",
  },
  {
    id: 84,
    role: "ARTISAN CHEESEMAKER",
    name: "Clifton Fine Cheese",
    subtitle: "Sophia Andreou",
    description:
      "Handmade soft, aged, and blue cheeses from a small dairy behind the shop on Princess Victoria Street. Milk collected three times a week from Bristol-area farms — never ultra-pasteurised.",
    image: "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=500&q=80",
    heroImage: "https://images.pexels.com/photos/6585008/pexels-photo-6585008.jpeg?auto=compress&cs=tinysrgb&w=1200",
    location: "Clifton, Bristol, BS8 4BX",
    farmSize: "On-site Dairy",
    primaryCrops: "Bristol Brie, Clifton Blue, Aged Cheddar",
    quote: "I'm not trying to compete with French cheese. I'm making something that could only come from Bristol.",
    fullStory:
      "Clifton Fine Cheese was opened in 2009 by cheesemaker Sophia Andreou, who trained under master fromager Pierre Coulon in Lyon before returning to her adopted home city of Bristol.\n\nSophia makes all her cheeses by hand in a small dairy behind the shop on Princess Victoria Street, using milk collected three times a week from four farms within 15 miles of Bristol.\n\nShe refuses to use ultra-pasteurised milk, which she believes kills the flavour complexity that makes artisan cheese worth eating. Her soft Bristol Brie has become something of a local institution, regularly selling out within hours of being ready.\n\nThe blue cheese — a bold, buttery variety she calls 'Clifton Blue' — won a silver medal at the World Cheese Awards in 2022. Sophia says she's not trying to compete with French cheese. She's trying to make something that could only come from Bristol, from this milk, from this moment in time.",
  },
  {
    id: 85,
    role: "BOTANICAL DRINKS MAKER",
    name: "Severn Cordial Co.",
    subtitle: "Rosa & Finn Watkins",
    description:
      "Small-batch cordials and pressed juices made from foraged and farmed ingredients from Bristol's green corridors. No artificial flavours, no concentrates — real fruit, real taste.",
    image: "https://images.pexels.com/photos/7509232/pexels-photo-7509232.jpeg?auto=compress&cs=tinysrgb&w=800",
    heroImage: "https://images.pexels.com/photos/36743571/pexels-photo-36743571.jpeg?auto=compress&cs=tinysrgb&w=1200",
    location: "Bedminster, Bristol, BS3 4AP",
    farmSize: "Micro-Brewery",
    primaryCrops: "Elderflower Cordial, Sloe Gin, Wild Blackcurrant Juice",
    quote: "It's a drink that tells you what time of year it is.",
    fullStory:
      "Severn Cordial Co. was founded in 2017 by siblings Rosa and Finn Watkins in a converted brewery unit in Bedminster.\n\nRosa, a trained botanist, spends the warmer months foraging elderflower, sloe, and wild blackcurrant from the hedgerows and parks of Bristol — from Ashton Court to the Avon Gorge.\n\nFinn, who previously worked in craft brewing, handles the production — pressing, blending, and bottling everything by hand in small batches.\n\nTheir philosophy is simple: use only what grows within Bristol's green belt, and use all of it. Excess elderflower becomes cordial, then syrup, then vinegar. Nothing is wasted.\n\nThe range changes with the seasons, which means their product list looks different in February than it does in August. Regular customers say that's exactly the point — it's a drink that tells you what time of year it is.",
  },
];

// ── Recipes (based on real product data) ─────────────────────────────────────
const latestRecipes = [
  { id: 1, time: "15 min",      title: "Wild Garlic & Spring Greens Pesto",       image: "https://images.unsplash.com/photo-1621501635732-7e5e20a7e6b7?w=600&q=80", rating: 5 },
  { id: 2, time: "40 min",      title: "Heritage Tomato & Somerset Brie Tart",    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80", rating: 5 },
  { id: 3, time: "20 min",      title: "Roasted Wonky Carrot & Cumin Salad",      image: "https://images.unsplash.com/photo-1447175008436-054170c2e979?w=600&q=80", rating: 5 },
  { id: 4, time: "1 hr 20 min", title: "Slow-Cooked Somerset Beef & Cider Stew", image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80", rating: 5 },
];

const popularRecipes = [
  { id: 5, time: "15 min", title: "Sourdough & Mushroom Bruschetta",           image: "https://images.unsplash.com/photo-1551183053-bf91798d9e14?w=600&q=80", rating: 5 },
  { id: 6, time: "10 min", title: "Somerset Brie with Mendip Honey & Walnuts", image: "https://images.unsplash.com/photo-1624806992066-5ffcf7ca186b?w=600&q=80", rating: 5 },
  { id: 7, time: "30 min", title: "Zero-Waste Cauliflower Leaf Curry",         image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80", rating: 5 },
  { id: 8, time: "35 min", title: "Mendip Honey & Bristol Berry Pavlova",      image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80", rating: 4 },
];

const categories = ["Seasonal Recipes", "Zero-Waste Cooking", "Storage Guides", "Farm Stories", "Low-Mile Meals"];

type RecipeItem = { id: number; time: string; title: string; image: string; rating: number };

const categoryContent: Record<string, RecipeItem[]> = {
  "Seasonal Recipes": latestRecipes.slice(0, 3),
  "Zero-Waste Cooking": [
    { id: 10, time: "30 min",     title: "Zero-Waste Cauliflower Leaf Curry",     image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80", rating: 5 },
    { id: 11, time: "15 min",     title: "Broccoli Stem & Carrot Top Slaw",        image: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=600&q=80", rating: 4 },
    { id: 12, time: "50 min",     title: "Overripe Banana Bread with Mendip Honey",image: "https://images.unsplash.com/photo-1606101273945-e9eba92b1d88?w=600&q=80", rating: 5 },
  ],
  "Storage Guides": [
    { id: 13, time: "5 min read", title: "How to Store Root Veg for Months",       image: "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=600&q=80", rating: 5 },
    { id: 14, time: "3 min read", title: "Reviving Wilted Greens with Ice Water",  image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&q=80", rating: 5 },
    { id: 15, time: "4 min read", title: "Freezing Summer Berries the Right Way",  image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&q=80", rating: 4 },
  ],
  "Farm Stories": [
    { id: 16, time: "10 min read", title: "Four Generations: The Fletcher Family Farm",  image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=80", rating: 5 },
    { id: 17, time: "8 min read",  title: "Why Huw Stopped Spraying His Orchard",       image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&q=80", rating: 5 },
    { id: 18, time: "6 min read",  title: "Marco's 200-Year-Old Sourdough Starter",     image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80", rating: 5 },
  ],
  "Low-Mile Meals": [
    { id: 19, time: "25 min", title: "100% Bristol-Sourced Full Breakfast",       image: "https://images.unsplash.com/photo-1484723091739-30990116f5b2?w=600&q=80", rating: 5 },
    { id: 20, time: "35 min", title: "Local Foraged Mushroom & Herb Risotto",    image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&q=80", rating: 5 },
    { id: 21, time: "1 hr",   title: "Somerset Cider & Apple Braised Pork",      image: "https://images.unsplash.com/photo-1544025162-d76538897a07?w=600&q=80", rating: 4 },
  ],
};

const storageGuides = [
  { subtitle: "Root Veg",     title: "How to Store Root Veg for Months",  body: "Keep your carrots, potatoes, and beets crisp and fresh through the winter with these traditional methods.", image: "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=800&q=80" },
  { subtitle: "Leafy Greens", title: "Reviving Wilted Greens",            body: "Don't throw them away. The ice-water trick brings sad, floppy spinach and lettuce back to crisp perfection.", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&q=80" },
  { subtitle: "Fresh Herbs",  title: "Make Herbs Last Weeks",             body: "The glass-of-water method vs. the damp-towel method — how Somerset Herb Garden's Amara Osei stores hers.", image: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=80" },
  { subtitle: "Fruit",        title: "Counter vs. Fridge",                body: "Which fruits belong on the counter and which need the crisper drawer? A quick guide from Wye Valley Orchard.", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800&q=80" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function RecipeCard({ item }: { item: RecipeItem }) {
  const [hov, setHov] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", flexDirection: "column", cursor: "pointer" }}>
      <div style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", marginBottom: 14, background: C.heroBg, borderRadius: 12 }}>
        <img
          src={imgFailed ? "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=80" : item.image}
          alt={item.title} onError={() => setImgFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: hov ? "scale(1.05)" : "scale(1)", transition: "transform 0.5s ease" }}
        />
        <button style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
          <Bookmark size={13} />
        </button>
        <div style={{ position: "absolute", bottom: -14, right: 14, width: 36, height: 36, background: "#1b4332", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 800, fontFamily: font, border: `2px solid ${C.sectionBg}`, zIndex: 2, lineHeight: 1.2, textAlign: "center" }}>
          BRFN
        </div>
      </div>
      <div style={{ paddingTop: 8 }}>
        <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: C.textBody, fontFamily: font }}>{item.time}</p>
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: C.textPrimary, lineHeight: 1.35, fontFamily: font,
          textDecoration: hov ? "underline" : "none",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        } as React.CSSProperties}>{item.title}</h3>
        <div style={{ display: "flex", gap: 2 }}>
          {[1,2,3,4,5].map(i => <Star key={i} size={12} fill={i <= item.rating ? C.textBody : "none"} color={i <= item.rating ? C.textBody : "#ccc"} />)}
        </div>
      </div>
    </div>
  );
}

function StorageGuidesBanners() {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
      {storageGuides.map((g, i) => (
        <div key={g.subtitle} onMouseEnter={() => setHovIdx(i)} onMouseLeave={() => setHovIdx(null)}
          style={{ position: "relative", borderRadius: 24, overflow: "hidden", aspectRatio: "16/9", cursor: "pointer" }}>
          <img src={g.image} alt={g.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: hovIdx === i ? "scale(1.05)" : "scale(1)", transition: "transform 0.7s ease" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,30,20,0.88), rgba(20,30,20,0.35), transparent)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, padding: "26px 26px", width: "100%", boxSizing: "border-box" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", color: "#fff", padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10, fontFamily: font }}>
              <Info size={11} /> {g.subtitle}
            </span>
            <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "#fff", lineHeight: 1.3, fontFamily: font }}>{g.title}</h3>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(225,225,215,0.9)", lineHeight: 1.55, fontFamily: font }}>{g.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 900, color: C.textPrimary, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: font }}>{title}</h2>
      {subtitle && <p style={{ margin: 0, fontSize: 14, color: C.textBody, fontFamily: font }}>{subtitle}</p>}
    </div>
  );
}

function FarmerMiniCard({ farmer, onClick }: { farmer: (typeof farmers)[0]; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", flexDirection: "column", cursor: "pointer" }}>
      <div style={{ aspectRatio: "4/5", overflow: "hidden", borderRadius: 14, background: C.heroBg, marginBottom: 12 }}>
        <img src={farmer.image} alt={farmer.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: hov ? "scale(1.05)" : "scale(1)", transition: "transform 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: C.green, marginBottom: 5, fontFamily: font }}>{farmer.role}</span>
      <h3 style={{ margin: "0 0 5px", fontSize: 15, fontWeight: 700, color: C.textPrimary, fontFamily: font, textDecoration: hov ? "underline" : "none" }}>{farmer.name}</h3>
      <p style={{ margin: 0, fontSize: 12, color: C.textBody, lineHeight: 1.6, fontFamily: font,
        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
      } as React.CSSProperties}>{farmer.description}</p>
    </div>
  );
}

function FarmerDetail({ farmer, onBack }: { farmer: (typeof farmers)[0]; onBack: () => void }) {
  const paragraphs = farmer.fullStory.split("\n\n");
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProducts, setShowProducts] = useState(false);

  function handleShopProduce() {
    if (showProducts) { setShowProducts(false); return; }
    setLoadingProducts(true);
    api.get(`/accounts/producers/${farmer.id}/`)
      .then((r) => { setProducts(r.data.products ?? []); setShowProducts(true); })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{ background: C.sectionBg, paddingBottom: 60 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 14px" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontWeight: 600, fontSize: 14, fontFamily: font }}>
          <ChevronRight size={18} style={{ transform: "rotate(180deg)" }} /> Back to Farmers
        </button>
      </div>
      {/* Hero */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 24px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
        <div>
          <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.green, marginBottom: 12, fontFamily: font }}>{farmer.role}</span>
          <h1 style={{ margin: "0 0 6px", fontSize: 40, fontWeight: 800, color: C.textPrimary, lineHeight: 1.15, fontFamily: "Georgia, serif" }}>{farmer.name}</h1>
          <p style={{ margin: "0 0 22px", fontSize: 15, color: C.textMuted, fontFamily: font }}>{farmer.subtitle}</p>
          <blockquote style={{ margin: 0, fontSize: 19, fontStyle: "italic", color: C.textBody, borderLeft: `4px solid ${C.green}`, paddingLeft: 20, lineHeight: 1.65, fontFamily: "Georgia, serif" }}>
            "{farmer.quote}"
          </blockquote>
        </div>
        <div style={{ borderRadius: 22, overflow: "hidden", boxShadow: "0 10px 36px rgba(0,0,0,0.13)" }}>
          <img src={farmer.heroImage} alt={farmer.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
        </div>
      </div>
      {/* Story + sidebar */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: 40, alignItems: "start" }}>
        <div>
          {paragraphs.map((p, i) => (
            <p key={i} style={{ margin: "0 0 20px", fontSize: i === 0 ? 16 : 14, color: i === 0 ? C.textPrimary : C.textBody, lineHeight: 1.85, fontFamily: font }}>{p}</p>
          ))}
        </div>
        <div style={{ background: C.cardBg, borderRadius: 20, padding: "26px 22px", border: `1px solid ${C.cardBorder}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", position: "sticky", top: 20 }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: C.textMuted, borderBottom: `1px solid ${C.cardBorder}`, paddingBottom: 14, fontFamily: font }}>Farm Facts</h3>
          {[["Location", farmer.location], ["Farm Size", farmer.farmSize], ["Primary Crops", farmer.primaryCrops]].map(([label, val]) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: C.textMuted, marginBottom: 3, fontFamily: font }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary, fontFamily: font }}>{val}</span>
            </div>
          ))}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.cardBorder}` }}>
            <button onClick={handleShopProduce} disabled={loadingProducts} style={{ width: "100%", background: C.green, color: "#fff", border: "none", borderRadius: 999, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: font, opacity: loadingProducts ? 0.7 : 1 }}>
              {loadingProducts ? "Loading..." : showProducts ? "Hide Produce" : "Shop Their Produce"} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
      {/* Inline products */}
      {showProducts && (
        <div style={{ maxWidth: 1200, margin: "40px auto 0", padding: "0 24px" }}>
          <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 800, color: C.textPrimary, fontFamily: font }}>
            {farmer.name}'s Produce
          </h2>
          {products.length === 0 ? (
            <p style={{ color: C.textMuted, fontFamily: font }}>No products available right now.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
              {products.map((p) => {
                const img = p.image_source || p.image_url;
                return (
                  <div key={p.id} style={{ background: C.cardBg, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.cardBorder}`, boxShadow: C.cardShadow }}>
                    {img && <img src={img.startsWith("http") ? img : `http://127.0.0.1:8000${img}`} alt={p.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />}
                    <div style={{ padding: "14px 16px" }}>
                      {p.category?.name && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.green, fontFamily: font }}>{p.category.name}</span>}
                      <h3 style={{ margin: "6px 0 4px", fontSize: 15, fontWeight: 700, color: C.textPrimary, fontFamily: font }}>{p.name}</h3>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.green, fontFamily: font }}>£{parseFloat(p.price).toFixed(2)} <span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}>/ {p.unit}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function FarmerList({ onSelect }: { onSelect: (id: number) => void }) {
  const [hovId, setHovId] = useState<number | null>(null);
  return (
    <div style={{ background: C.sectionBg }}>
      <div style={{ background: C.greenDark, padding: "52px 24px 160px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: 2, textTransform: "uppercase", fontFamily: font }}>MEET THE FARMERS</h2>
          <p style={{ margin: 0, fontSize: 16, color: "rgba(255,255,255,0.8)", fontFamily: font }}>Discover the stories behind our local growers, bakers, and producers.</p>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: "-120px auto 0", padding: "0 24px 60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 24 }}>
          {farmers.map(f => (
            <div key={f.id} onClick={() => onSelect(f.id)} onMouseEnter={() => setHovId(f.id)} onMouseLeave={() => setHovId(null)}
              style={{ display: "flex", flexDirection: "column", cursor: "pointer" }}>
              <div style={{ position: "relative", aspectRatio: "4/5", overflow: "hidden", borderRadius: 18, background: C.heroBg, marginBottom: 16 }}>
                <img src={f.image} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: hovId === f.id ? "scale(1.05)" : "scale(1)", transition: "transform 0.5s ease" }} />
                {hovId === f.id && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ background: "#fff", color: C.textPrimary, padding: "10px 22px", borderRadius: 999, fontWeight: 700, fontSize: 13, fontFamily: font }}>Read Story</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: C.green, marginBottom: 6, fontFamily: font }}>{f.role}</span>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: C.textPrimary, fontFamily: font, textDecoration: hovId === f.id ? "underline" : "none" }}>{f.name}</h3>
              <p style={{ margin: 0, fontSize: 13, color: C.textBody, lineHeight: 1.6, fontFamily: font,
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
              } as React.CSSProperties}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type Tab = "All Content" | "Farm Stories" | "Seasonal Recipes" | "Storage Guides";

export default function CommunityHub() {
  const [activeTab, setActiveTab]       = useState<Tab>("All Content");
  const [activeCategory, setActiveCategory] = useState("Seasonal Recipes");
  const [selectedFarmerId, setSelectedFarmerId] = useState<number | null>(null);

  const selectedFarmer = farmers.find(f => f.id === selectedFarmerId);

  const tabs: { id: Tab; label: string; icon?: React.ReactNode }[] = [
    { id: "All Content",      label: "All Content" },
    { id: "Farm Stories",     label: "Farm Stories",     icon: <BookOpen size={14} /> },
    { id: "Seasonal Recipes", label: "Seasonal Recipes", icon: <ChefHat size={14} /> },
    { id: "Storage Guides",   label: "Storage Guides",   icon: <Info size={14} /> },
  ];

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setSelectedFarmerId(null);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{ fontFamily: font, background: C.pageBg, minHeight: "100vh" }}>

      {/* ── Hero + tabs ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 24px 0" }}>
        <div style={{ background: C.heroBg, borderRadius: 28, padding: "52px 48px 44px", marginBottom: 28, border: `1px solid ${C.heroBorder}`, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase", color: C.green, marginBottom: 16, fontFamily: font }}>
            <BookOpen size={13} /> Community &amp; Education
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 700, color: C.textPrimary, margin: "0 0 16px", lineHeight: 1.25, fontFamily: "Georgia, serif", letterSpacing: -0.3, maxWidth: 620 }}>
            Community &amp; Education Hub
          </h1>
          <p style={{ color: C.textBody, fontSize: 16, lineHeight: 1.8, margin: 0, maxWidth: 560 }}>
            Discover the stories behind your food, learn how to make it last longer, and find
            seasonal inspiration from local chefs and producers across the Bristol region.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 0 }}>
          {tabs.map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => switchTab(t.id)} style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "10px 20px", borderRadius: 999,
                border: active ? "1px solid #40916c" : `1px solid ${C.cardBorder}`,
                background: active ? C.greenDark : C.cardBg,
                color: active ? "#fff" : C.textBody,
                fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: font,
                transition: "background 0.15s, color 0.15s",
              }}>
                {t.icon}{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

        {/* FARM STORIES */}
        {activeTab === "Farm Stories" && (
          selectedFarmer
            ? <FarmerDetail farmer={selectedFarmer} onBack={() => setSelectedFarmerId(null)} />
            : <FarmerList onSelect={setSelectedFarmerId} />
        )}

        {/* STORAGE GUIDES */}
        {activeTab === "Storage Guides" && (
          <div style={{ background: C.sectionBg, padding: "48px 24px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <SectionHead title="Storage Guides" subtitle="Keep your produce fresh for longer with these expert tips from our producers" />
              <StorageGuidesBanners />
            </div>
          </div>
        )}

        {/* ALL CONTENT + SEASONAL RECIPES */}
        {(activeTab === "All Content" || activeTab === "Seasonal Recipes") && (
          <>
            {activeTab === "All Content" && (
              <div style={{ maxWidth: 1200, margin: "32px auto 0", padding: "0 24px" }}>
                {/* Featured 2-col grid */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 48 }}>
                  {/* Big story */}
                  <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", cursor: "pointer", minHeight: 380 }}>
                    <img src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&q=80" alt="Farm Story"
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,30,20,0.88), rgba(20,30,20,0.38), transparent)" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, padding: "36px", width: "100%", boxSizing: "border-box" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", color: "#fff", padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 14, fontFamily: font }}>
                        <BookOpen size={11} /> Farm Story
                      </span>
                      <h2 style={{ margin: "0 0 12px", fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1.3, maxWidth: 420, fontFamily: "Georgia, serif" }}>
                        Four Generations of Organic Farming at Green Valley Farm
                      </h2>
                      <p style={{ margin: "0 0 18px", fontSize: 14, color: "rgba(225,225,215,0.9)", lineHeight: 1.65, maxWidth: 380, fontFamily: font }}>
                        Meet Daniel and Priya Fletcher, tending the same Somerset hillside their great-grandfather broke ground on in 1947.
                      </p>
                      <button onClick={() => { switchTab("Farm Stories"); setSelectedFarmerId(1); }}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: font }}>
                        Read Full Story <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Two right cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ flex: 1, background: C.greenLight, borderRadius: 24, padding: "26px", border: `1px solid ${C.heroBorder}`, display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "pointer" }}>
                      <div>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.cardBg, color: C.green, padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 14, fontFamily: font }}>
                          <ChefHat size={11} /> Seasonal Recipe
                        </span>
                        <h3 style={{ margin: "0 0 10px", fontSize: 19, fontWeight: 700, color: C.textPrimary, lineHeight: 1.3, fontFamily: font }}>Wild Garlic & Spring Greens Pesto</h3>
                        <p style={{ margin: 0, fontSize: 13, color: C.textBody, lineHeight: 1.65, fontFamily: font }}>Make the most of the short wild garlic season with this vibrant, versatile pesto. Perfect for pasta or roasted veg.</p>
                      </div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.green, fontWeight: 600, fontSize: 13, marginTop: 16, fontFamily: font }}>
                        View Recipe <ArrowRight size={13} />
                      </div>
                    </div>

                    <div style={{ flex: 1, borderRadius: 24, overflow: "hidden", position: "relative", cursor: "pointer", minHeight: 140 }}>
                      <img src="https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=600&q=80" alt="Storage"
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
                      <div style={{ position: "absolute", inset: 0, background: C.textPrimary }} />
                      <div style={{ position: "relative", padding: "26px", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", boxSizing: "border-box" }}>
                        <div>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.18)", color: "#fff", padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 14, fontFamily: font }}>
                            <Info size={11} /> Storage Guide
                          </span>
                          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#fff", lineHeight: 1.3, fontFamily: font }}>How to Store Root Veg for Months</h3>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", marginTop: 12 }}>
                          <PlayCircle size={30} strokeWidth={1.5} />
                          <span style={{ fontSize: 13, fontWeight: 500, fontFamily: font }}>Watch 2 min guide</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Storage guides preview */}
                <div style={{ marginBottom: 0 }}>
                  <SectionHead title="Storage Guides" subtitle="Keep your produce fresh for longer with expert tips from our growers" />
                  <StorageGuidesBanners />
                </div>
              </div>
            )}

            {/* Recipe sections */}
            <div style={{ background: C.sectionBg, padding: "56px 24px", marginTop: 48 }}>
              <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 60 }}>

                <section>
                  <SectionHead title="The Latest Recipes" subtitle="Our newest recipes to inspire your next meal" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 24 }}>
                    {latestRecipes.map(r => <RecipeCard key={r.id} item={r} />)}
                  </div>
                </section>

                <section>
                  <SectionHead title="Meet The Farmers" subtitle="Discover exclusive stories from our local growers and producers." />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 24 }}>
                    {farmers.map(f => (
                      <FarmerMiniCard
                        key={f.id}
                        farmer={f}
                        onClick={() => { switchTab("Farm Stories"); setSelectedFarmerId(f.id); }}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <SectionHead title="Our Most Popular Recipes" subtitle="Which will you cook first?" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 24 }}>
                    {popularRecipes.map(r => <RecipeCard key={r.id} item={r} />)}
                  </div>
                </section>

                <section>
                  <SectionHead title="Browse By Recipe Type" />
                  <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ width: 200, flexShrink: 0 }}>
                      {categories.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "13px 18px", border: "none", cursor: "pointer",
                          fontWeight: 700, fontSize: 13, fontFamily: font,
                          background: activeCategory === cat ? C.textPrimary : "transparent",
                          color: activeCategory === cat ? "#fff" : C.textPrimary,
                          transition: "background 0.15s",
                        }}>{cat}</button>
                      ))}
                    </div>
                    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 24 }}>
                      {(categoryContent[activeCategory] ?? []).map(r => <RecipeCard key={r.id} item={r} />)}
                    </div>
                  </div>
                </section>

              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
