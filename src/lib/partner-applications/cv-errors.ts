export type PartnerApplicationCvErrorCode =
  | "cv_invalid"
  | "cv_not_uploaded"
  | "cv_move_failed"
  | "cv_update_failed";

export class PartnerApplicationCvError extends Error {
  readonly code: PartnerApplicationCvErrorCode;

  constructor(code: PartnerApplicationCvErrorCode, message?: string) {
    super(message ?? code);
    this.name = "PartnerApplicationCvError";
    this.code = code;
  }
}
