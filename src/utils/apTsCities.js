// ADDED: Telangana + Andhra Pradesh cities for the Service Calls "City" dropdown,
// and the areas of the bigger cities for the "Location" dropdown.
// To add a city: add it to TS_CITIES / AP_CITIES (A-Z order).
// To add areas for a city: add a line in CITY_AREAS. Cities with no area list
// get a normal text box for Location.
import { HYDERABAD_AREAS } from "./hyderabadAreas.js";

export const TS_CITIES = [
  "Hyderabad", "Secunderabad",
  "Adilabad", "Bhadrachalam", "Bhongir", "Bodhan", "Gadwal", "Hanamkonda", "Jagtial", "Jangaon",
  "Kamareddy", "Karimnagar", "Khammam", "Kodad", "Kothagudem", "Mahabubabad", "Mahbubnagar",
  "Mancherial", "Medak", "Miryalaguda", "Nagarkurnool", "Nalgonda", "Nirmal", "Nizamabad",
  "Peddapalli", "Ramagundam", "Sangareddy", "Siddipet", "Sircilla", "Suryapet", "Vikarabad",
  "Wanaparthy", "Warangal", "Zaheerabad",
];

export const AP_CITIES = [
  "Visakhapatnam", "Vijayawada",
  "Amalapuram", "Amaravati", "Anakapalli", "Anantapur", "Bhimavaram", "Chilakaluripet", "Chittoor",
  "Dharmavaram", "Eluru", "Gudivada", "Guntakal", "Guntur", "Hindupur", "Kadapa", "Kakinada",
  "Kavali", "Kurnool", "Machilipatnam", "Madanapalle", "Mangalagiri", "Nandyal", "Narasaraopet",
  "Nellore", "Ongole", "Palakollu", "Proddatur", "Puttaparthi", "Rajahmundry", "Srikakulam",
  "Srikalahasti", "Tadepalligudem", "Tanuku", "Tenali", "Tirupati", "Vizianagaram",
];

export const CITY_AREAS = {
  Hyderabad: HYDERABAD_AREAS,
  Secunderabad: [
    "AS Rao Nagar", "Alwal", "Begumpet", "Bolarum", "Bowenpally", "ECIL", "Karkhana", "Kompally",
    "Lalaguda", "Malkajgiri", "Marredpally", "Mettuguda", "Neredmet", "Paradise", "Rasoolpura",
    "Sainikpuri", "Secunderabad Cantonment", "Sikh Village", "Tarnaka", "Trimulgherry", "Yapral",
  ],
  Visakhapatnam: [
    "Akkayyapalem", "Arilova", "Asilmetta", "Beach Road", "Bheemunipatnam", "Dwaraka Nagar",
    "Gajuwaka", "Gopalapatnam", "Kancharapalem", "Kommadi", "Lawsons Bay Colony", "MVP Colony",
    "Maddilapalem", "Madhurawada", "Marripalem", "NAD Junction", "PM Palem", "Pendurthi",
    "Rushikonda", "Seethammadhara", "Simhachalam", "Siripuram", "Visalakshi Nagar", "Yendada",
  ],
  Vijayawada: [
    "Ajit Singh Nagar", "Auto Nagar", "Benz Circle", "Bhavanipuram", "Enikepadu", "Gollapudi",
    "Governorpet", "Gunadala", "Kanuru", "Labbipet", "Machavaram", "Moghalrajpuram", "One Town",
    "Patamata", "Payakapuram", "Penamaluru", "Poranki", "Ramavarappadu", "Satyanarayanapuram",
    "Suryaraopet", "Tadigadapa", "Vidyadharapuram",
  ],
  Guntur: [
    "Amaravati Road", "Arundelpet", "Ashok Nagar", "Brindavan Gardens", "Brodipet",
    "Chandramouli Nagar", "Gorantla", "Koritepadu", "Kothapet", "Lakshmipuram", "Nallapadu",
    "Pattabhipuram", "Syamala Nagar", "Vidya Nagar",
  ],
  Tirupati: [
    "Air Bypass Road", "Alipiri", "Bairagi Patteda", "Balaji Colony", "KT Road", "Korlagunta",
    "MR Palli", "Mangalam", "Padmavathi Nagar", "Renigunta Road", "Srinivasapuram", "Tiruchanoor",
  ],
  Warangal: [
    "Balasamudram", "Fort Warangal", "Hanamkonda", "Hunter Road", "Kashibugga", "Kazipet",
    "Kishanpura", "Matwada", "Mulugu Road", "Naimnagar", "Nakkalagutta", "Rangampet", "Shivnagar",
    "Subedari", "Waddepally",
  ],
};

const norm = (v) => String(v || "").trim().toLowerCase();
export const ALL_CITIES = [...TS_CITIES, ...AP_CITIES];
// the city written exactly as in the list (ignoring capitals / spaces), or ""
export const matchCity = (v) => ALL_CITIES.find((c) => norm(c) === norm(v)) || "";
// areas of a city ([] when the city has no area list)
export const areasFor = (city) => {
  const c = matchCity(city);
  return (c && CITY_AREAS[c]) || [];
};

// ADDED: states for the State dropdown (State -> City -> Location in every form)
export const STATES = ["Telangana", "Andhra Pradesh"];
export const citiesOf = (state) => (state === "Telangana" ? TS_CITIES : state === "Andhra Pradesh" ? AP_CITIES : []);
// state of a city in our lists ("" when not found) - used for old records saved without a state
export const stateOfCity = (city) => {
  const c = matchCity(city);
  if (!c) return "";
  return TS_CITIES.includes(c) ? "Telangana" : "Andhra Pradesh";
};
