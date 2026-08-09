// krankenkasse.js (Datenbank & Logik für Krankenkassen)

var KRANKENKASSEN = {
    "standard": { name: "Durchschnitt (1,7%)", zusatz: 0.017, tags: "durchschnitt 1.7" },
    "techniker": { name: "Techniker Krankenkasse (TK) (1,2%)", zusatz: 0.012, tags: "tk techniker krankenkasse" },
    "barmer": { name: "BARMER (2,19%)", zusatz: 0.0219, tags: "barmer" },
    "dak": { name: "DAK Gesundheit (1,7%)", zusatz: 0.017, tags: "dak gesundheit" },
    "aok_nw": { name: "AOK NordWest (1,89%)", zusatz: 0.0189, tags: "aok nordwest nw" },
    "aok_rh": { name: "AOK Rheinland/Hamburg (2,2%)", zusatz: 0.022, tags: "aok rheinland hamburg rh" },
    "bkk_firmus": { name: "bkk firmus (0,9%)", zusatz: 0.009, tags: "bkk firmus" },
    "hkk": { name: "hkk Krankenkasse (0,98%)", zusatz: 0.0098, tags: "hkk" },
    "sbk": { name: "SBK Siemens-Betriebskrankenkasse (1,7%)", zusatz: 0.017, tags: "sbk siemens" },
    "individuell": { name: "Eigener Zusatzbeitrag...", zusatz: 0.017, tags: "eigener individuell manuell" }
};

/**
 * Gibt den Arbeitnehmer-Anteil des Zusatzbeitrags zurück (Hälfte des Gesamtzusatzbeitrags).
 */
function getArbeitnehmerZusatzbeitrag(kkKey, customZusatz) {
    var gesamtZusatz = (kkKey === "individuell") 
        ? (customZusatz / 100) 
        : (KRANKENKASSEN[kkKey] ? KRANKENKASSEN[kkKey].zusatz : 0.017);
        
    return gesamtZusatz / 2;
}
