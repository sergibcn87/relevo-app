import * as React from 'react'

import { Heading, Text } from '@react-email/components'
import { brand, EmailShell, styles } from './brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailShell preview="Tu código de verificación de Relevo">
    <Heading style={styles.h1}>Tu código de verificación</Heading>
    <Text style={styles.text}>Introduce este código para continuar:</Text>
    <Text
      style={{
        fontSize: '28px',
        fontWeight: 700,
        letterSpacing: '6px',
        color: brand.forest,
        backgroundColor: brand.softGreen,
        borderRadius: '12px',
        padding: '14px 20px',
        textAlign: 'center' as const,
        margin: '0 0 16px',
      }}
    >
      {token}
    </Text>
    <Text style={styles.note}>
      Si no has solicitado este código, puedes ignorar este correo con tranquilidad.
    </Text>
  </EmailShell>
)

export default ReauthenticationEmail
