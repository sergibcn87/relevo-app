import * as React from 'react'

import { Button, Heading, Text } from '@react-email/components'
import { EmailShell, styles } from './brand'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailShell preview={`Confirma tu nuevo correo en ${siteName}`}>
    <Heading style={styles.h1}>Confirma tu nuevo correo</Heading>
    <Text style={styles.text}>
      Has solicitado cambiar el correo de tu cuenta de <strong>{siteName}</strong>
      {oldEmail ? (
        <>
          {' '}
          (antes <strong>{oldEmail}</strong>)
        </>
      ) : null}{' '}
      a <strong>{newEmail || email}</strong>.
    </Text>
    <Text style={styles.text}>Pulsa el botón para confirmar el cambio:</Text>
    <Button className="dm-btn" style={styles.button} href={confirmationUrl}>
      Confirmar nuevo correo
    </Button>
    <Text style={styles.note}>
      Si no has solicitado este cambio, puedes ignorar este correo: tu dirección actual seguirá
      siendo la misma.
    </Text>
  </EmailShell>
)

export default EmailChangeEmail
