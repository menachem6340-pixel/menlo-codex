/**
 * חישוב כמויות אוטומטי מתוצאות ניתוח תכנית
 * ממיר את הנתונים שה-AI חילץ לכמויות מוכנות לכתב הכמויות
 */

interface Room {
  name: string;
  length_m?: number;
  width_m?: number;
  height_m?: number;
  area_sqm: number;
  perimeter_m?: number;
  floor_type?: string;
  wall_finish?: string;
}

interface Opening {
  type: string;
  width_m: number;
  height_m: number;
  count: number;
}

interface AnalysisData {
  plan_category?: string;
  plan_type?: string;
  plan_name?: string;
  architectural_area_sqm?: number;
  rooms?: Room[];
  structural_elements?: {
    foundations?: { concrete_volume_m3?: number; rebar_tons?: number };
    piles?: Array<{ depth_m?: number; count?: number }>;
    concrete_total_m3?: number;
    rebar_total_tons?: number;
  };
  openings?: {
    doors?: Opening[];
    windows?: Opening[];
  };
  electrical?: {
    outlets_count?: number;
    switches_count?: number;
    ceiling_lights_count?: number;
  };
  plumbing?: {
    sinks?: number;
    toilets?: number;
    showers?: number;
    bathtubs?: number;
  };
  systems?: {
    electrical?: {
      outlets_count?: number;
      switches_count?: number;
      ceiling_lights_count?: number;
    };
    plumbing?: {
      sinks?: number;
      toilets?: number;
      showers?: number;
      bathtubs?: number;
      pipes_length_m?: number;
    };
    drainage?: {
      pipes_length_m?: number;
      inspection_chambers_count?: number;
      drains_count?: number;
    };
    hvac?: {
      duct_length_m?: number;
      diffusers_count?: number;
      units_count?: number;
    };
    waterproofing?: {
      roof_area_sqm?: number;
      wet_rooms_area_sqm?: number;
      balconies_area_sqm?: number;
    };
  };
  rebar_breakdown?: Array<{ weight_kg?: number }>;
  totals?: {
    architectural_area_sqm?: number;
    gross_area_sqm?: number;
    net_area_sqm?: number;
    built_area_sqm?: number;
    rooms_count?: number;
    doors_count?: number;
    windows_count?: number;
    wet_rooms_count?: number;
  };
  boq_suggestions?: Array<{
    chapter?: string;
    category?: string;
    items: Array<{
      description: string;
      unit: string;
      quantity: number;
      calculation?: string;
      estimated_unit_price_ils?: number;
      confidence?: "high" | "medium" | "low";
      confidence_score?: number;
      extraction_method?: string;
      validation_status?: string;
      source_drawing?: string;
      drawing_number?: string;
      room_or_zone?: string;
      human_review_required?: boolean;
      warnings?: string[];
      notes?: string;
      client_price_ils?: number;
      contractor_price_ils?: number;
      subcontractor_price_ils?: number;
    }>;
  }>;
}

export interface CalculatedQuantity {
  description: string;
  unit: string;
  quantity: number;
  source: string; // איך חושב
  unitPrice?: number;
  confidenceScore?: number;
  extractionMethod?: string;
  validationStatus?: string;
  sourceDrawing?: string;
  roomOrZone?: string;
  humanReviewRequired?: boolean;
  warnings?: string[];
}

/**
 * זהה אם חדר הוא רטוב (אמבטיה/מקלחת/שירותים)
 */
function isWetRoom(name: string): boolean {
  return /רחצה|מקלחת|שירות|שירותים|אמבטיה|חדר רחצה|כביסה|מטבח/.test(name);
}

/**
 * זהה אם חדר חוץ (מרפסת/חצר)
 */
function isExternalRoom(name: string): boolean {
  return /מרפסת|חצר|גג|מסתור/.test(name);
}

/**
 * אסוף שטחי קרמיקה (חדרים רטובים)
 */
function calcCeramicFloorArea(rooms: Room[]): number {
  return rooms
    .filter((r) => isWetRoom(r.name) || r.floor_type?.includes("קרמיקה"))
    .reduce((s, r) => s + (r.area_sqm || 0), 0);
}

/**
 * אסוף שטחי ריצוף לא-רטוב (פרקט/שיש/לא רטוב)
 */
function calcDryFloorArea(rooms: Room[]): number {
  return rooms
    .filter((r) => !isWetRoom(r.name) && !isExternalRoom(r.name))
    .reduce((s, r) => s + (r.area_sqm || 0), 0);
}

/**
 * חיפוי קירות חדרי רחצה (היקף × גובה - שטחי פתחים)
 */
function calcWetWallCladding(rooms: Room[]): number {
  let total = 0;
  for (const r of rooms.filter((r) => isWetRoom(r.name))) {
    const perimeter = r.perimeter_m || (r.length_m && r.width_m ? (r.length_m + r.width_m) * 2 : 0);
    const height = r.height_m || 2.6;
    total += perimeter * height * 0.85; // הפחתה של 15% לדלת ופתחים
  }
  return total;
}

/**
 * שטח טיח פנים (כל החדרים, היקף × גובה - פתחים)
 */
function calcInnerPlaster(rooms: Room[], openingsArea: number): number {
  let total = 0;
  for (const r of rooms.filter((r) => !isExternalRoom(r.name))) {
    const perimeter = r.perimeter_m || (r.length_m && r.width_m ? (r.length_m + r.width_m) * 2 : 0);
    const height = r.height_m || 2.6;
    total += perimeter * height;
  }
  return Math.max(0, total - openingsArea);
}

/**
 * חישוב שטח כולל של פתחים (לחיסור מטיח)
 */
function calcOpeningsArea(openings: { doors?: Opening[]; windows?: Opening[] }): number {
  let area = 0;
  for (const d of openings.doors || []) area += d.width_m * d.height_m * d.count;
  for (const w of openings.windows || []) area += w.width_m * w.height_m * w.count;
  return area;
}

function normalizePlanCategory(analysis: AnalysisData): string {
  const value = `${analysis.plan_category || analysis.plan_type || ""}`.toLowerCase();
  if (/architecture|architectural|אדריכ/.test(value)) return "architecture";
  if (/structure|structural|קונס|בטון|ברזל/.test(value)) return "structure";
  if (/electrical|חשמל/.test(value)) return "electrical";
  if (/plumbing|drainage|אינסטל|מים|ביוב|ניקוז/.test(value)) return "plumbing";
  if (/hvac|מיזוג|אוורור|איורור/.test(value)) return "hvac";
  if (/waterproofing|איטום/.test(value)) return "waterproofing";
  if (/fire_safety|fire|כיבוי|אש/.test(value)) return "fire_safety";
  if (/finishing|גמר|פנים/.test(value)) return "finishing";
  if (/site|פיתוח|שטח/.test(value)) return "site";
  return value || "other";
}

function usesArchitectureQuantities(category: string): boolean {
  return ["architecture", "finishing", "other"].includes(category);
}

function usesStructureQuantities(category: string): boolean {
  return ["structure", "other"].includes(category);
}

function usesElectricalQuantities(category: string): boolean {
  return ["electrical", "other"].includes(category);
}

function usesPlumbingQuantities(category: string): boolean {
  return ["plumbing", "site", "other"].includes(category);
}

function usesHvacQuantities(category: string): boolean {
  return ["hvac", "other"].includes(category);
}

function usesWaterproofingQuantities(category: string): boolean {
  return ["architecture", "finishing", "site", "waterproofing", "other"].includes(category);
}

function getArchitecturalArea(analysis: AnalysisData, rooms: Room[]): number {
  return (
    analysis.totals?.architectural_area_sqm ||
    analysis.totals?.gross_area_sqm ||
    analysis.totals?.built_area_sqm ||
    analysis.architectural_area_sqm ||
    rooms.reduce((sum, room) => sum + (room.area_sqm || 0), 0)
  );
}

/**
 * חישוב כמויות אוטומטיות לפי פרק
 * מחזיר אובייקט: chapter → array של פריטים עם כמויות מחושבות
 */
export function calculateQuantitiesFromAnalysis(
  analyses: AnalysisData[]
): Record<string, CalculatedQuantity[]> {
  // אסוף את כל החדרים והפתחים מכל הניתוחים
  const allRooms: Room[] = [];
  const allOpenings = { doors: [] as Opening[], windows: [] as Opening[] };
  let totalDoorsCount = 0;
  let totalWindowsCount = 0;
  let totalWetRoomsCount = 0;
  let totalBuiltArea = 0;
  let concreteTotalM3 = 0;
  let rebarTotalTons = 0;
  let pilesLengthM = 0;
  let outletsCount = 0;
  let switchesCount = 0;
  let ceilingLightsCount = 0;
  let sinksCount = 0;
  let toiletsCount = 0;
  let showersCount = 0;
  let bathtubsCount = 0;
  let plumbingPipeLength = 0;
  let drainagePipeLength = 0;
  let inspectionChambersCount = 0;
  let drainsCount = 0;
  let hvacDuctLength = 0;
  let hvacDiffusersCount = 0;
  let hvacUnitsCount = 0;
  let waterproofingArea = 0;

  for (const analysis of analyses) {
    const category = normalizePlanCategory(analysis);

    if (usesArchitectureQuantities(category)) {
      const rooms = analysis.rooms || [];
      if (rooms.length > 0) allRooms.push(...rooms);
      if (analysis.openings?.doors) allOpenings.doors.push(...analysis.openings.doors);
      if (analysis.openings?.windows) allOpenings.windows.push(...analysis.openings.windows);
      totalDoorsCount += analysis.totals?.doors_count || 0;
      totalWindowsCount += analysis.totals?.windows_count || 0;
      totalWetRoomsCount += analysis.totals?.wet_rooms_count || 0;
      totalBuiltArea += getArchitecturalArea(analysis, rooms);
    }

    if (usesStructureQuantities(category)) {
      concreteTotalM3 +=
        analysis.structural_elements?.concrete_total_m3 ||
        analysis.structural_elements?.foundations?.concrete_volume_m3 ||
        0;

      const rebarFromSummary =
        analysis.structural_elements?.rebar_total_tons ||
        analysis.structural_elements?.foundations?.rebar_tons ||
        0;
      const rebarFromBreakdown =
        (analysis.rebar_breakdown?.reduce((sum, bar) => sum + (bar.weight_kg || 0), 0) || 0) / 1000;
      rebarTotalTons += rebarFromSummary || rebarFromBreakdown;

      pilesLengthM +=
        analysis.structural_elements?.piles?.reduce(
          (sum, pile) => sum + (pile.depth_m || 0) * (pile.count || 1),
          0
        ) || 0;
    }

    if (usesElectricalQuantities(category)) {
      outletsCount += analysis.electrical?.outlets_count || analysis.systems?.electrical?.outlets_count || 0;
      switchesCount += analysis.electrical?.switches_count || analysis.systems?.electrical?.switches_count || 0;
      ceilingLightsCount +=
        analysis.electrical?.ceiling_lights_count || analysis.systems?.electrical?.ceiling_lights_count || 0;
    }

    if (usesPlumbingQuantities(category)) {
      sinksCount += analysis.plumbing?.sinks || analysis.systems?.plumbing?.sinks || 0;
      toiletsCount += analysis.plumbing?.toilets || analysis.systems?.plumbing?.toilets || 0;
      showersCount += analysis.plumbing?.showers || analysis.systems?.plumbing?.showers || 0;
      bathtubsCount += analysis.plumbing?.bathtubs || analysis.systems?.plumbing?.bathtubs || 0;
      plumbingPipeLength += analysis.systems?.plumbing?.pipes_length_m || 0;
      drainagePipeLength += analysis.systems?.drainage?.pipes_length_m || 0;
      inspectionChambersCount += analysis.systems?.drainage?.inspection_chambers_count || 0;
      drainsCount += analysis.systems?.drainage?.drains_count || 0;
    }

    if (usesHvacQuantities(category)) {
      hvacDuctLength += analysis.systems?.hvac?.duct_length_m || 0;
      hvacDiffusersCount += analysis.systems?.hvac?.diffusers_count || 0;
      hvacUnitsCount += analysis.systems?.hvac?.units_count || 0;
    }

    if (usesWaterproofingQuantities(category)) {
      waterproofingArea +=
        (analysis.systems?.waterproofing?.roof_area_sqm || 0) +
        (analysis.systems?.waterproofing?.wet_rooms_area_sqm || 0) +
        (analysis.systems?.waterproofing?.balconies_area_sqm || 0);
    }
  }

  // אם אין totals, חשב מהחדרים
  if (totalBuiltArea === 0 && allRooms.length > 0) {
    totalBuiltArea = allRooms.reduce((s, r) => s + (r.area_sqm || 0), 0);
  }
  if (totalWetRoomsCount === 0) {
    totalWetRoomsCount = allRooms.filter((r) => isWetRoom(r.name)).length;
  }
  if (totalDoorsCount === 0) {
    totalDoorsCount = allOpenings.doors.reduce((sum, door) => sum + (door.count || 0), 0);
  }
  if (totalWindowsCount === 0) {
    totalWindowsCount = allOpenings.windows.reduce((sum, window) => sum + (window.count || 0), 0);
  }

  const ceramicArea = calcCeramicFloorArea(allRooms);
  const dryFloorArea = calcDryFloorArea(allRooms);
  const wetWallArea = calcWetWallCladding(allRooms);
  const openingsArea = calcOpeningsArea(allOpenings);
  const innerPlasterArea = calcInnerPlaster(allRooms, openingsArea);

  const result: Record<string, CalculatedQuantity[]> = {};

  // 2. אדריכלות - שטח מ"ר אדריכלי כבסיס לפרויקט
  if (totalBuiltArea > 0) {
    result["2. בנייה חדשה"] = [
      {
        description: "שטח אדריכלי בנוי לפי תכנית אדריכלית",
        unit: "מ\"ר",
        quantity: round2(totalBuiltArea),
        source: "מ\"ר אדריכלי שנלקח מתכניות אדריכלות בלבד",
      },
    ];
  }

  // 3. קונסטרוקציה
  const structureItems: CalculatedQuantity[] = [];
  if (concreteTotalM3 > 0) {
    structureItems.push({
      description: "בטון יסודות B30",
      unit: "מ\"ק",
      quantity: round2(concreteTotalM3),
      source: "כמות בטון שחולצה מתכניות קונסטרוקציה",
    });
  }
  if (rebarTotalTons > 0) {
    structureItems.push({
      description: "ברזל זיון",
      unit: "טון",
      quantity: round2(rebarTotalTons),
      source: "כמות ברזל שחולצה מתכניות קונסטרוקציה",
    });
  }
  if (pilesLengthM > 0) {
    structureItems.push({
      description: "כלונסאות קדוחים",
      unit: "מ\"א",
      quantity: round2(pilesLengthM),
      source: "סכום עומקי כלונסאות לפי תכנית קונסטרוקציה",
    });
  }
  if (structureItems.length > 0) {
    result["3. עבודות בטון וברזל"] = structureItems;
  }

  // 4. טיח
  if (innerPlasterArea > 0) {
    result["4. טיח"] = [
      {
        description: "טיח פנים - מתחת לקרמיקה",
        unit: "מ\"ר",
        quantity: round2(wetWallArea),
        source: `חישוב: ${allRooms.filter((r) => isWetRoom(r.name)).length} חדרים רטובים`,
      },
      {
        description: "טיח פנים - מתחת לצבע",
        unit: "מ\"ר",
        quantity: round2(innerPlasterArea - wetWallArea),
        source: "כל הקירות בניכוי חדרים רטובים ופתחים",
      },
      {
        description: "טיח תקרה",
        unit: "מ\"ר",
        quantity: round2(totalBuiltArea),
        source: "שטח בנוי כולל",
      },
    ];
  }

  // 5. איטום
  if (totalWetRoomsCount > 0 || waterproofingArea > 0) {
    result["5. איטום"] = [
      {
        description: "איטום חדר רחצה - פוליאוריתן",
        unit: "מ\"ר",
        quantity: round2(waterproofingArea || ceramicArea),
        source: waterproofingArea ? "שטחי איטום שחולצו מתכניות איטום/יועצים" : `${totalWetRoomsCount} חדרים רטובים`,
      },
    ];
  }

  // 6. ריצוף רצפות
  result["6. ריצוף רצפות"] = [];
  if (ceramicArea > 0) {
    result["6. ריצוף רצפות"].push({
      description: "ריצוף קרמיקה 60×60 - חדרים רטובים",
      unit: "מ\"ר",
      quantity: round2(ceramicArea),
      source: `סך שטחי חדרי רחצה ומטבח`,
    });
  }
  if (dryFloorArea > 0) {
    result["6. ריצוף רצפות"].push({
      description: "ריצוף שיש/פרקט - חדרים יבשים",
      unit: "מ\"ר",
      quantity: round2(dryFloorArea),
      source: "שטח כולל בניכוי חדרים רטובים",
    });
  }
  if (totalBuiltArea > 0) {
    result["6. ריצוף רצפות"].push({
      description: "פלינטוס",
      unit: "מ\"א",
      quantity: round2(allRooms.reduce((s, r) => s + (r.perimeter_m || 0), 0) * 0.85),
      source: "סכום היקפים בניכוי דלתות",
    });
  }

  // 7. חיפוי קירות
  if (wetWallArea > 0) {
    result["7. חיפוי קירות"] = [
      {
        description: "חיפוי קרמיקה - חדרי רחצה",
        unit: "מ\"ר",
        quantity: round2(wetWallArea),
        source: `קירות ${totalWetRoomsCount} חדרים רטובים בניכוי פתחים`,
      },
    ];
  }

  // 8. תקרות
  if (totalBuiltArea > 0) {
    result["8. תקרות והנמכות"] = [
      {
        description: "תקרת גבס מונמכת",
        unit: "מ\"ר",
        quantity: round2(totalBuiltArea * 0.4), // הערכה - 40% מהשטח עם תקרת גבס
        source: "הערכה - 40% מהשטח (לעדכן)",
      },
    ];
  }

  // 9. חשמל - רק מפרמטרים שחולצו מתכנית חשמל
  if (outletsCount > 0 || switchesCount > 0 || ceilingLightsCount > 0) {
    const electricalItems: CalculatedQuantity[] = [];
    if (outletsCount + switchesCount > 0) {
      electricalItems.push({
        description: "נקודת חשמל (שקע/מתג)",
        unit: "יח'",
        quantity: outletsCount + switchesCount,
        source: "נספר מתכנית חשמל",
      });
    }
    if (ceilingLightsCount > 0) {
      electricalItems.push({
        description: "נקודת תאורה (גוף + חיווט)",
        unit: "יח'",
        quantity: ceilingLightsCount,
        source: "נספר מתכנית חשמל",
      });
    }
    electricalItems.push({
        description: "לוח חשמל ראשי",
        unit: "יח'",
        quantity: 1,
        source: "סטנדרט",
    });
    result["9. חשמל"] = electricalItems;
  }

  // 10. אינסטלציה
  if (
    plumbingPipeLength > 0 ||
    sinksCount > 0 ||
    toiletsCount > 0 ||
    showersCount > 0 ||
    bathtubsCount > 0
  ) {
    const plumbingItems: CalculatedQuantity[] = [];
    if (plumbingPipeLength > 0) {
      plumbingItems.push({
        description: "צנרת מים/ביוב",
        unit: "מ\"א",
        quantity: round2(plumbingPipeLength),
        source: "אורך צנרת שחולץ מתכנית אינסטלציה",
      });
    }
    if (toiletsCount > 0) {
      plumbingItems.push({
        description: "אסלה תלויה (כולל מיכל)",
        unit: "יח'",
        quantity: toiletsCount,
        source: "נספר מתכנית אינסטלציה",
      });
    }
    if (sinksCount > 0) {
      plumbingItems.push({
        description: "כיור + ברז",
        unit: "יח'",
        quantity: sinksCount,
        source: "נספר מתכנית אינסטלציה",
      });
    }
    if (showersCount + bathtubsCount > 0) {
      plumbingItems.push({
        description: "מקלחון/אמבטיה",
        unit: "יח'",
        quantity: showersCount + bathtubsCount,
        source: "נספר מתכנית אינסטלציה",
      });
    }
    result["10. אינסטלציה"] = plumbingItems;
  }

  if (drainagePipeLength > 0 || inspectionChambersCount > 0 || drainsCount > 0) {
    result["15. נלוות וכלליות"] = [
      ...(result["15. נלוות וכלליות"] || []),
      {
        description: "קווי ניקוז",
        unit: "מ\"א",
        quantity: round2(drainagePipeLength),
        source: "אורך קווי ניקוז שחולץ מתכנית ניקוז",
      },
      {
        description: "תאי ביקורת / קולטנים",
        unit: "יח'",
        quantity: inspectionChambersCount + drainsCount,
        source: "כמות תאי ביקורת וקולטנים מתכנית ניקוז",
      },
    ].filter((item) => item.quantity > 0);
  }

  if (hvacDuctLength > 0 || hvacDiffusersCount > 0 || hvacUnitsCount > 0) {
    result["15. נלוות וכלליות"] = [
      ...(result["15. נלוות וכלליות"] || []),
      {
        description: "תעלות מיזוג",
        unit: "מ\"א",
        quantity: round2(hvacDuctLength),
        source: "אורך תעלות שחולץ מתכנית מיזוג",
      },
      {
        description: "דיפיוזרים / תריסי אוויר",
        unit: "יח'",
        quantity: hvacDiffusersCount,
        source: "כמות דיפיוזרים מתכנית מיזוג",
      },
      {
        description: "יחידות מיזוג",
        unit: "יח'",
        quantity: hvacUnitsCount,
        source: "כמות יחידות מתכנית מיזוג",
      },
    ].filter((item) => item.quantity > 0);
  }

  // 11. נגרות - דלתות וחלונות
  if (totalDoorsCount > 0 || totalWindowsCount > 0) {
    const items: CalculatedQuantity[] = [];
    if (totalDoorsCount > 0) {
      items.push({
        description: "דלת פנים מעץ",
        unit: "יח'",
        quantity: Math.max(0, totalDoorsCount - 1), // - דלת כניסה
        source: `${totalDoorsCount} דלתות סך הכל בניכוי דלת כניסה`,
      });
      items.push({
        description: "דלת כניסה משוריינת",
        unit: "יח'",
        quantity: 1,
        source: "סטנדרט",
      });
    }
    if (items.length > 0) result["11. נגרות"] = items;
  }

  // 13. צבע
  if (innerPlasterArea > 0) {
    const paintArea = innerPlasterArea - wetWallArea; // לא צובעים מתחת לקרמיקה
    result["13. צבע"] = [
      {
        description: "צבע פנים אקרילי - 2 שכבות",
        unit: "מ\"ר",
        quantity: round2(paintArea),
        source: "כל הקירות בניכוי חיפוי קרמיקה",
      },
      {
        description: "סיוד תקרה",
        unit: "מ\"ר",
        quantity: round2(totalBuiltArea),
        source: "שטח בנוי כולל",
      },
    ];
  }

  // 14. אלומיניום
  if (allOpenings.windows.length > 0) {
    const totalWindowArea = allOpenings.windows.reduce(
      (s, w) => s + w.width_m * w.height_m * w.count,
      0
    );
    result["14. אלומיניום וזיגוג"] = [
      {
        description: "חלון אלומיניום סטנדרטי",
        unit: "מ\"ר",
        quantity: round2(totalWindowArea),
        source: `${totalWindowsCount} חלונות סך הכל`,
      },
    ];
  }

  mergeAiSuggestions(result, analyses);

  return result;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mergeAiSuggestions(
  result: Record<string, CalculatedQuantity[]>,
  analyses: AnalysisData[]
) {
  for (const analysis of analyses) {
    for (const suggestion of analysis.boq_suggestions || []) {
      const chapterName = normalizeChapterName(suggestion.chapter || suggestion.category || "");
      if (!result[chapterName]) result[chapterName] = [];

      for (const item of suggestion.items || []) {
        if (!item.description || !item.quantity) continue;

        const existing = result[chapterName].find((current) =>
          sameItem(current.description, item.description)
        );

        if (existing) {
          existing.quantity = Math.max(existing.quantity, round2(item.quantity));
          if (!existing.unitPrice && item.estimated_unit_price_ils) {
            existing.unitPrice = item.estimated_unit_price_ils;
          }
          existing.source = `${existing.source}; AI: ${item.calculation || "סעיף שהוצע מהתכניות"}`;
          existing.confidenceScore = Math.max(
            existing.confidenceScore || 0,
            item.confidence_score || confidenceTextToScore(item.confidence) || 0
          );
          existing.extractionMethod = existing.extractionMethod || item.extraction_method;
          existing.validationStatus = existing.validationStatus || item.validation_status;
          existing.sourceDrawing = existing.sourceDrawing || item.source_drawing || item.drawing_number;
          existing.roomOrZone = existing.roomOrZone || item.room_or_zone;
          existing.humanReviewRequired = existing.humanReviewRequired || item.human_review_required;
          existing.warnings = [...(existing.warnings || []), ...(item.warnings || [])];
        } else {
          result[chapterName].push({
            description: item.description,
            unit: item.unit,
            quantity: round2(item.quantity),
            source: item.calculation || "סעיף שהוצע על ידי AI מניתוח התכניות",
            unitPrice: item.client_price_ils || item.estimated_unit_price_ils,
            confidenceScore: item.confidence_score || confidenceTextToScore(item.confidence),
            extractionMethod: item.extraction_method,
            validationStatus: item.validation_status,
            sourceDrawing: item.source_drawing || item.drawing_number,
            roomOrZone: item.room_or_zone,
            humanReviewRequired: item.human_review_required,
            warnings: item.warnings,
          });
        }
      }
    }
  }
}

function confidenceTextToScore(value?: "high" | "medium" | "low"): number | undefined {
  if (value === "high") return 90;
  if (value === "medium") return 75;
  if (value === "low") return 50;
  return undefined;
}

function normalizeChapterName(value: string): string {
  const text = value.replace(/^\d+\.\s*/, "");
  if (/הריסה|פירוק/.test(text)) return "1. הריסה ופירוק";
  if (/בנייה|בלוק|מחיצ/.test(text)) return "2. בנייה חדשה";
  if (/בטון|ברזל|קונסטרוקציה|יסוד|כלונס/.test(text)) return "3. עבודות בטון וברזל";
  if (/טיח/.test(text)) return "4. טיח";
  if (/איטום/.test(text)) return "5. איטום";
  if (/ריצוף|רצפה|פרקט/.test(text)) return "6. ריצוף רצפות";
  if (/חיפוי|קרמיקה/.test(text)) return "7. חיפוי קירות";
  if (/תקרה|גבס|הנמכ/.test(text)) return "8. תקרות והנמכות";
  if (/חשמל|תאורה|שקע|מתג/.test(text)) return "9. חשמל";
  if (/אינסטלציה|מים|ביוב|כיור|אסלה|מקלחון|אמבטיה/.test(text)) return "10. אינסטלציה";
  if (/נגרות|דלת|ארון/.test(text)) return "11. נגרות";
  if (/שיש|משטח/.test(text)) return "12. שיש ומשטחים";
  if (/צבע|סיוד/.test(text)) return "13. צבע";
  if (/אלומיניום|חלון|זיגוג|תריס/.test(text)) return "14. אלומיניום וזיגוג";
  return "15. נלוות וכלליות";
}

function sameItem(a: string, b: string): boolean {
  const left = a.replace(/\s+/g, " ").trim();
  const right = b.replace(/\s+/g, " ").trim();
  if (left === right) return true;

  const leftWords = left.split(/\s+/).filter((word) => word.length > 2);
  const rightWords = right.split(/\s+/).filter((word) => word.length > 2);
  const common = leftWords.filter((word) =>
    rightWords.some((other) => other.includes(word) || word.includes(other))
  );

  return common.length >= 3;
}
