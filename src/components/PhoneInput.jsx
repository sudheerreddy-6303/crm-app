import React from "react";
import { hidePhones, maskPhone } from "../utils/maskPhone.js";

// ADDED: phone box used in the edit forms.
//  - Admin: normal box (full number, can edit) - same as before.
//  - Telecaller, record that ALREADY has a number: locked box showing
//    "xxxxxxx789". The real number stays in the form, so saving never
//    changes or loses it.
//  - Telecaller, empty number (e.g. adding a new record): normal box so the
//    number can be typed in.
// UPDATED: the FULL number is shown in the forms again (for telecallers too) -
// numbers are hidden only on cards / tables / view pop-ups.
// Set LOCK_IN_FORMS = true to hide the number inside the forms as well.
const LOCK_IN_FORMS = false;

export default function PhoneInput({ value, onChange, original, placeholder, disabled }) {
  if (LOCK_IN_FORMS && hidePhones() && original) {
    return (
      <input className="phone-locked" value={maskPhone(value)} readOnly disabled
             title="Phone number is hidden" aria-label="Phone number (hidden)" />
    );
  }
  return <input value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} />;
}
