import React, { useEffect, useState } from "react";
import { STATES, TS_CITIES, AP_CITIES, citiesOf, matchCity, stateOfCity, areasFor } from "../utils/apTsCities.js";

// ADDED: State -> City -> Location fields, used in every form.
//  - State: Telangana / Andhra Pradesh.
//  - City: the cities of the chosen state (both states grouped when no state is
//    chosen yet). "Other (type city)" shows a text box.
//  - Location: the areas of the chosen city when we have a list for it,
//    with "Other (type location)" for a text box; otherwise a text box.
// Renders 3 fields that sit inside the form's .form-grid.
// Props: values { state, city, location }, onChange(key, value),
//        keys (optional) - field names in the form, e.g. { location: "site_location" },
//        locationRequired (shows the * on Location), labels (optional).
const OTHER = "__other__";
const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

export default function StateCityLocation({ values, onChange, keys = {}, locationRequired = false, locationLabel = "Location" }) {
  const k = { state: "state", city: "city", location: "location", ...keys };
  const state = values[k.state] || "";
  const city = values[k.city] || "";
  const location = values[k.location] || "";

  const [cityOther, setCityOther] = useState(false);
  const [locOther, setLocOther] = useState(false);

  // old records: no state saved but the city is in our list -> fill the state
  useEffect(() => {
    if (!state && city) {
      const s = stateOfCity(city);
      if (s) onChange(k.state, s);
    }
    // eslint-disable-next-line
  }, [city]);

  const cityList = state ? citiesOf(state) : [...TS_CITIES, ...AP_CITIES];
  const cityInList = cityList.find((c) => same(c, city)) || "";
  const cityIsOther = cityOther || Boolean(city && !cityInList);

  const areas = cityIsOther ? [] : areasFor(cityInList);
  const locInList = areas.find((a) => same(a, location)) || "";
  const locIsOther = locOther || Boolean(location && !locInList);

  const pickState = (s) => {
    onChange(k.state, s);
    // a city from the other state is cleared (a typed "Other" city is kept)
    if (city && !cityIsOther && !citiesOf(s).some((c) => same(c, city))) {
      onChange(k.city, "");
      onChange(k.location, "");
      setLocOther(false);
    }
  };
  const pickCity = (v) => {
    if (v === OTHER) { setCityOther(true); if (cityInList) { onChange(k.city, ""); onChange(k.location, ""); } setLocOther(false); return; }
    setCityOther(false);
    onChange(k.city, v);
    if (!state) { const s = stateOfCity(v); if (s) onChange(k.state, s); }
    // a location from the old city's list is cleared
    const newAreas = areasFor(v);
    if (location && newAreas.length && !newAreas.some((a) => same(a, location))) onChange(k.location, "");
    setLocOther(false);
  };
  const pickLocation = (v) => {
    if (v === OTHER) { setLocOther(true); if (locInList) onChange(k.location, ""); return; }
    setLocOther(false);
    onChange(k.location, v);
  };

  return (
    <>
      <div>
        <label>State</label>
        <select value={state} onChange={(e) => pickState(e.target.value)}>
          <option value="">Select state</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label>City</label>
        <select value={cityIsOther ? OTHER : cityInList} onChange={(e) => pickCity(e.target.value)}>
          <option value="">{state ? `Select city in ${state}` : "Select city"}</option>
          {state ? (
            citiesOf(state).map((c) => <option key={c} value={c}>{c}</option>)
          ) : (
            <>
              <optgroup label="Telangana">{TS_CITIES.map((c) => <option key={`ts-${c}`} value={c}>{c}</option>)}</optgroup>
              <optgroup label="Andhra Pradesh">{AP_CITIES.map((c) => <option key={`ap-${c}`} value={c}>{c}</option>)}</optgroup>
            </>
          )}
          <option value={OTHER}>Other (type city)</option>
        </select>
        {cityIsOther && (
          <input style={{ marginTop: 8 }} value={city} onChange={(e) => onChange(k.city, e.target.value)} placeholder="Type city" autoFocus={cityOther && !city} />
        )}
      </div>
      <div>
        <label>{locationLabel}{locationRequired && <span className="req"> *</span>}</label>
        {areas.length > 0 ? (
          <>
            <select value={locIsOther ? OTHER : locInList} onChange={(e) => pickLocation(e.target.value)}>
              <option value="">Select location in {matchCity(city) || city}</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
              <option value={OTHER}>Other (type area)</option>
            </select>
            {locIsOther && (
              <input style={{ marginTop: 8 }} value={location} onChange={(e) => onChange(k.location, e.target.value)} placeholder="Type area / locality" autoFocus={locOther && !location} />
            )}
          </>
        ) : (
          <input value={location} onChange={(e) => onChange(k.location, e.target.value)}
            placeholder={city ? `Area / locality in ${city}` : "Area / locality"} />
        )}
      </div>
    </>
  );
}
