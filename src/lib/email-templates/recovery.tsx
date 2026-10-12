import * as React from 'react'

import { Button, Heading, Text } from '@react-email/components'
import { EmailShell, styles } from './brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <EmailShell preview={`Restablece tu contraseña de ${siteName}`}>
    <Heading style={styles.h1}>Restablece tu contraseña</Heading>
    <Text style={styles.text}>
      Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de{' '}
      <strong>{siteName}</strong>.
    </Text>
    <Text style={styles.text}>Pulsa el botón para elegir una contraseña nueva:</Text>
    <Button className="dm-btn" style={styles.button} href={confirmationUrl}>
      Restablecer contraseña
    </Button>
    <Text style={styles.note}>
      Si no has pedido restablecer la contraseña, puedes ignorar este correo. El enlace caduca
      pasado un tiempo.
    </Text>
  </EmailShell>
)

export default RecoveryEmail
