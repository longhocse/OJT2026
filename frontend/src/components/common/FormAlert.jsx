import React from "react";

const FormAlert = ({ message }) =>
  message ? (
    <div
      role="alert"
      tabIndex="-1"
      className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
    >
      {message}
    </div>
  ) : null;

export default FormAlert;
