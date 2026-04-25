"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { toast } from "sonner";

type AuthFormErrorBoundaryProps = {
  children: ReactNode;
  errorToast: string;
  reloadMessage: string;
};

type AuthFormErrorBoundaryState = { didCatch: boolean };

/** Catches render errors around Supabase Auth UI; shows toast + fallback copy. */
export class AuthFormErrorBoundary extends Component<
  AuthFormErrorBoundaryProps,
  AuthFormErrorBoundaryState
> {
  state: AuthFormErrorBoundaryState = { didCatch: false };

  static getDerivedStateFromError(): AuthFormErrorBoundaryState {
    return { didCatch: true };
  }

  override componentDidCatch(error: unknown, _info: ErrorInfo): void {
    const message = error instanceof Error ? error.message : "Unknown error";
    toast.error(this.props.errorToast, {
      description: message,
    });
  }

  override render(): ReactNode {
    if (this.state.didCatch) {
      return (
        <p className="text-center text-muted-foreground text-sm">{this.props.reloadMessage}</p>
      );
    }
    return this.props.children;
  }
}
