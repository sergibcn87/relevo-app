import * as React from 'react'

import { Button, Heading, Link, Text } from '@react-email/components'
import { EmailShell, styles } from './brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <EmailShell preview={`Confirma tu correo para ${siteName}`}>
    <Heading style={styles.h1}>Confirma tu correo</Heading>
    <Text style={styles.text}>
      Gracias por crear tu cuenta en{' '}
      <Link href={siteUrl} style={styles.link}>
        <strong>{siteName}</strong>
      </Link>
      .
    </Text>
    <Text style={styles.text}>
      Confirma tu dirección de correo (
      <Link href={`mailto:${recipient}`} style={styles.link}>
        {recipient}
      </Link>
      ) pulsando el botón:
    </Text>
    <Button className="dm-btn" style={styles.button} href={confirmationUrl}>
      Confirmar correo
    </Button>
    <Text style={styles.note}>
      Si no has creado una cuenta, puedes ignorar este correo con tranquilidad.
    </Text>
  </EmailShell>
)

export default SignupEmail
