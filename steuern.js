// steuern.js

var STEUER_PARAMS = {
    // Beitragsbemessungsgrenzen (monatlich)
    bbgKV: 5512.50, 
    bbgRV_West: 8050.00,
    bbgRV_Ost: 7850.00,

    // Sozialabgaben Arbeitnehmeranteil (regulär)
    satzRV: 0.093, 
    satzAV: 0.013, 
    satzKV_Basis: 0.073, 
    satzKV_Zusatz: 0.0085, 

    // Pflegeversicherung (Arbeitnehmeranteil)
    satzPV_Basis: 0.017, 
    satzPV_Kinderlos: 0.023, 
    abschlagPV_ab_Kind2: 0.0025, 

    // Steuertarife
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

function calculateNettoDetails(monatsBrutto, steuerklasse, kirchensteuer, anzahlKinder, bundesland) {
    if (monatsBrutto <= 0) {
        return { brutto: 0, kv: 0, rv: 0, av: 0, pv: 0, lst: 0, soli: 0, kst: 0, netto: 0 };
    }

    var blData = BUNDESLAND_DATEN[bundesland] || BUNDESLAND_DATEN["NW"];
    var bbgRV = blData.gebiet === 'west' ? STEUER_PARAMS.bbgRV_West : STEUER_PARAMS.bbgRV_Ost;
    
    var rv = Math.min(monatsBrutto, bbgRV) * STEUER_PARAMS.satzRV;
    var av = Math.min(monatsBrutto, bbgRV) * STEUER_PARAMS.satzAV;
    var kv = Math.min(monatsBrutto, STEUER_PARAMS.bbgKV) * (STEUER_PARAMS.satzKV_Basis + STEUER_PARAMS.satzKV_Zusatz);
    
    var pvSatz = STEUER_PARAMS.satzPV_Basis;
    if (anzahlKinder === 0) {
        pvSatz = STEUER_PARAMS.satzPV_Kinderlos;
    } else if (anzahlKinder > 1) {
        var beruecksichtigteKinder = Math.min(anzahlKinder - 1, 4);
        pvSatz = Math.max(0, pvSatz - (beruecksichtigteKinder * STEUER_PARAMS.abschlagPV_ab_Kind2));
    }
    var pv = Math.min(monatsBrutto, STEUER_PARAMS.bbgKV) * pvSatz;

    var svBeitragMonat = kv + pv + rv + av;

    var jahresBrutto = monatsBrutto * 12;
    var zuVersteuerndesEinkommen = Math.max(0, jahresBrutto - (svBeitragMonat * 12) - 1230);

    if (steuerklasse === "3") {
        zuVersteuerndesEinkommen = Math.max(0, zuVersteuerndesEinkommen - STEUER_PARAMS.grundfreibetrag); 
    } else if (steuerklasse === "5") {
        zuVersteuerndesEinkommen = zuVersteuerndesEinkommen * 1.25; 
    }

    var jahresLohnsteuer = 0;
    if (zuVersteuerndesEinkommen > STEUER_PARAMS.grundfreibetrag) {
        var zvE = zuVersteuerndesEinkommen - STEUER_PARAMS.grundfreibetrag;
        if (zvE < 17000) {
            jahresLohnsteuer = zvE * 0.14 + (zvE * 0.05);
        } else if (zvE < 66760) {
            jahresLohnsteuer = 3500 + (zvE - 17000) * 0.30;
        } else {
            jahresLohnsteuer = 18400 + (zvE - 66760) * 0.42; 
        }
    }

    var lst = jahresLohnsteuer / 12;
    
    if(steuerklasse === "1") {
       lst = lst * 0.95; 
    }

    var soli = 0;
    if (lst > 1516) {
        soli = (lst - 1516) * 0.119;
        if (soli > lst * 0.055) {
            soli = lst * 0.055;
        }
    }

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