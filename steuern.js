// steuern.js (Exakte Bemessungsgrenzen & PV-Anpassung)

var STEUER_PARAMS = {
    // Bemessungsgrenzen
    bbgKV: 5512.50, 
    bbgRV_West: 7550.00,
    bbgRV_Ost: 7450.00,

    // Sozialabgaben Arbeitnehmeranteil
    satzRV: 0.093, 
    satzAV: 0.013, 
    satzKV_Basis: 0.073, // 7,3 %

    grundfreibetrag: 11784
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

function berechneBMFESt(zvE) {
    if (zvE <= 11784) {
        return 0;
    } else if (zvE <= 17005) {
        var y = (zvE - 11784) / 10000;
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

function calculateNettoDetails(monatsBrutto, steuerklasse, kirchensteuer, anzahlKinder, bundesland, kkKey, customZusatz) {
    if (monatsBrutto <= 0) {
        return { brutto: 0, kv: 0, rv: 0, av: 0, pv: 0, lst: 0, soli: 0, kst: 0, netto: 0 };
    }

    var blData = BUNDESLAND_DATEN[bundesland] || BUNDESLAND_DATEN["NW"];
    var bbgRV = blData.gebiet === 'west' ? STEUER_PARAMS.bbgRV_West : STEUER_PARAMS.bbgRV_Ost;
    
    var anZusatz = getArbeitnehmerZusatzbeitrag(kkKey, customZusatz);

    // 1. Sozialabgaben
    var rv = Math.min(monatsBrutto, bbgRV) * STEUER_PARAMS.satzRV;
    var av = Math.min(monatsBrutto, bbgRV) * STEUER_PARAMS.satzAV;
    var kv = Math.min(monatsBrutto, STEUER_PARAMS.bbgKV) * (STEUER_PARAMS.satzKV_Basis + anZusatz);
    
    // Pflegeversicherung (Staffelung nach Kinderanzahl)
    var pvSatzAN = 0.022; // Basis AN
    if (anzahlKinder === 0) {
        pvSatzAN = 0.028; // Kinderlos (+0,6%)
    } else if (anzahlKinder === 1) {
        pvSatzAN = 0.022;
    } else {
        // -0,25% ab dem 2. Kind
        var abschlag = Math.min(anzahlKinder - 1, 4) * 0.0025;
        pvSatzAN = Math.max(0.007, 0.017 - abschlag + 0.000125); // Exakter AN-Pflegesatz
    }
    
    var pv = Math.min(monatsBrutto, STEUER_PARAMS.bbgKV) * pvSatzAN;
    var svBeitragMonat = kv + pv + rv + av;

    // 2. Lohnsteuerberechnung mit BMF-Vorsorgepauschale
    var jahresBrutto = monatsBrutto * 12;
    var vspRentenversicherung = rv * 12;
    var vspKrankenPflege = (kv + pv) * 12 * 0.96; // Korrigierter Ansatz BMF
    var vorsorgePauschale = vspRentenversicherung + vspKrankenPflege;
    
    var zuVersteuerndesEinkommen = Math.max(0, jahresBrutto - vorsorgePauschale - 1230 - 36);

    var jahresLohnsteuer = 0;
    if (steuerklasse === "3") {
        jahresLohnsteuer = berechneBMFESt(zuVersteuerndesEinkommen / 2) * 2;
    } else if (steuerklasse === "5") {
        jahresLohnsteuer = berechneBMFESt(zuVersteuerndesEinkommen * 1.25);
    } else { 
        jahresLohnsteuer = berechneBMFESt(zuVersteuerndesEinkommen);
    }

    var lst = Math.floor(jahresLohnsteuer / 12);

    // 3. Soli
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
