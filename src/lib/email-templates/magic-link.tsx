import * as React from 'react'

import { Button, Heading, Text } from '@react-email/components'
import { EmailShell, styles } from './brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <EmailShell preview={`Tu enlace de acceso a ${siteName}`}>
    <Heading style={styles.h1}>Tu enlace de acceso</Heading>
    <Text style={styles.text}>
      Pulsa el botón para entrar en <strong>{siteName}</strong>. No hace falta contraseña.
    </Text>
    <Button className="dm-btn" style={styles.button} href={confirmationUrl}>
      Entrar en {siteName}
    </Button>
    <Text style={styles.note}>
      Si no has solicitado este enlace, puedes ignorar este correo con tranquilidad.
    </Text>
  </EmailShell>
)

export default MagicLinkEmail
