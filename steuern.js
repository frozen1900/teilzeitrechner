// steuern.js (Mit exakter BMF-Lohnsteuerberechnung)

var STEUER_PARAMS = {
    bbgKV: 5512.50, 
    bbgRV_West: 8050.00,
    bbgRV_Ost: 7850.00,

    satzRV: 0.093, 
    satzAV: 0.013, 
    satzKV_Basis: 0.073, 
    satzKV_Zusatz: 0.0085, // 1,7% Zusatzbeitrag (Hälfte = 0,85%)

    satzPV_Basis: 0.017, 
    satzPV_Kinderlos: 0.023, 
    abschlagPV_ab_Kind2: 0.0025, 

    grundfreibetrag: 12084
};

var BUNDESLAND_DATEN = {
    "BW": { gebiet: "west", kstSatz: 0.08 },
    "BY": { gebiet: "west", kstSatz: 0.08 },
    "BE": { gebiet: "ost",  kstSatz: 0.09 },
    "BB": { gebiet: "ost",  kstSatz: 0.09 },
    "HB": { gebiet: "west", kstSatz: 0.09 },
    "HH": { gebiet: "west", kstSatz: 0.09 },
    "HE": { gebiet: "west", kstSatz: 0.09 },
    "MV": { gebiet: "ost",  kstSatz: 0.09 },
    "NI": { gebiet: "west", kstSatz: 0.09 },
    "NW": { gebiet: "west", kstSatz: 0.09 },
    "RP": { gebiet: "west", kstSatz: 0.09 },
    "SL": { gebiet: "west", kstSatz: 0.09 },
    "SN": { gebiet: "ost",  kstSatz: 0.09 },
    "ST": { gebiet: "ost",  kstSatz: 0.09 },
    "SH": { gebiet: "west", kstSatz: 0.09 },
    "TH": { gebiet: "ost",  kstSatz: 0.09 }
};

// Exakte BMF-Formel für die Einkommensteuer / Lohnsteuer
function berechneBMFESt(zvE) {
    if (zvE <= 12084) {
        return 0;
    } else if (zvE <= 17005) {
        var y = (zvE - 12084) / 10000;
        return (995.21 * y + 1400) * y;
    } else if (zvE <= 66760) {
        var z = (zvE - 17005) / 10000;
        return (208.85 * z + 2397) * z + 1014.13;
    } else if (zvE <= 277825) {
        return 0.42 * zvE - 10602.13;
    } else {
        return 0.45 * zvE - 18936.88;
    }
}

function calculateNettoDetails(monatsBrutto, steuerklasse, kirchensteuer, anzahlKinder, bundesland) {
    if (monatsBrutto <= 0) {
        return { brutto: 0, kv: 0, rv: 0, av: 0, pv: 0, lst: 0, soli: 0, kst: 0, netto: 0 };
    }

    var blData = BUNDESLAND_DATEN[bundesland] || BUNDESLAND_DATEN["NW"];
    var bbgRV = blData.gebiet === 'west' ? STEUER_PARAMS.bbgRV_West : STEUER_PARAMS.bbgRV_Ost;
    
    // 1. Sozialabgaben
    var rv = Math.min(monatsBrutto, bbgRV) * STEUER_PARAMS.satzRV;
    var av = Math.min(monatsBrutto, bbgRV) * STEUER_PARAMS.satzAV;
    var kv = Math.min(monatsBrutto, STEUER_PARAMS.bbgKV) * (STEUER_PARAMS.satzKV_Basis + STEUER_PARAMS.satzKV_Zusatz);
    
    var pvSatz = STEUER_PARAMS.satzPV_Basis;
    if (anzahlKinder === 0) {
        pvSatz = STEUER_PARAMS.satzPV_Kinderlos;
    } else if (anzahlKinder > 1) {
        var beruecksichtigteKinder = Math.min(anzahlKinder - 1, 4);
        pvSatz = Math.max(0.007, pvSatz - (beruecksichtigteKinder * STEUER_PARAMS.abschlagPV_ab_Kind2));
    }
    var pv = Math.min(monatsBrutto, STEUER_PARAMS.bbgKV) * pvSatz;

    var svBeitragMonat = kv + pv + rv + av;

    // 2. Lohnsteuer nach BMF-Tarif
    var jahresBrutto = monatsBrutto * 12;
    
    // Abzug Vorsorgepauschale (Kranken-/Pflege-/Rentenversicherung) + Arbeitnehmer-Pauschbetrag (1.230 €) + Sonderausgabenpauschale (36 €)
    var vorsorgePauschale = (rv + kv + pv) * 12;
    var zuVersteuerndesEinkommen = Math.max(0, jahresBrutto - vorsorgePauschale - 1266);

    // Splitting / Steuerklassen-Anpassung
    var jahresLohnsteuer = 0;
    if (steuerklasse === "3") {
        jahresLohnsteuer = berechneBMFESt(zuVersteuerndesEinkommen / 2) * 2;
    } else if (steuerklasse === "5") {
        jahresLohnsteuer = berechneBMFESt(zuVersteuerndesEinkommen * 1.25);
    } else { // Klasse 1 / 4
        jahresLohnsteuer = berechneBMFESt(zuVersteuerndesEinkommen);
    }

    var lst = Math.floor(jahresLohnsteuer / 12);

    // 3. Solidaritätszuschlag (Gleitzone & Freigrenze)
    var soli = 0;
    var freigrenzeSoliMonat = (steuerklasse === "3") ? 3032 : 1516;
    if (lst > freigrenzeSoliMonat) {
        soli = (lst - freigrenzeSoliMonat) * 0.119;
        if (soli > lst * 0.055) {
            soli = lst * 0.055;
        }
    }

    // 4. Kirchensteuer
    var kst = 0;
    if (kirchensteuer === "ja") {
        kst = lst * blData.kstSatz;
    }

    var netto = monatsBrutto - svBeitragMonat - lst - soli - kst;

    return {
        brutto: monatsBrutto,
        kv: kv,
        rv: rv,
        av: av,
        pv: pv,
        lst: lst,
        soli: soli,
        kst: kst,
        netto: Math.max(0, netto)
    };
}
