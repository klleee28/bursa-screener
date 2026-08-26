"use client"

import { useActionState } from "react"
import { LockKeyholeIcon, MailIcon } from "lucide-react"

import { signInAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

export function LoginForm({ disabled = false }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(signInAction, {})

  return (
    <form action={action} className="flex flex-col gap-7">
      <FieldGroup>
        <Field data-invalid={Boolean(state.error) || undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <InputGroup>
            <InputGroupAddon><MailIcon /></InputGroupAddon>
            <InputGroupInput id="email" name="email" type="email" autoComplete="email" placeholder="admin@example.com" required disabled={disabled} aria-invalid={Boolean(state.error)} />
          </InputGroup>
        </Field>
        <Field data-invalid={Boolean(state.error) || undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <InputGroup>
            <InputGroupAddon><LockKeyholeIcon /></InputGroupAddon>
            <InputGroupInput id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" minLength={8} required disabled={disabled} aria-invalid={Boolean(state.error)} />
          </InputGroup>
          <FieldError>{state.error}</FieldError>
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" disabled={disabled || pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
