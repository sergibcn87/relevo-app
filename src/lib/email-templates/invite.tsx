import * as React from 'react'

import { Button, Heading, Link, Text } from '@react-email/components'
import { EmailShell, styles } from './brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <EmailShell preview={`Te han invitado a ${siteName}`}>
    <Heading style={styles.h1}>Te han invitado a {siteName}</Heading>
    <Text style={styles.text}>
      Alguien te ha invitado a unirte a{' '}
      <Link href={siteUrl} style={styles.link}>
        <strong>{siteName}</strong>
      </Link>
      , la app para organizar el cuidado de una casa durante una ausencia.
    </Text>
    <Text style={styles.text}>Pulsa el botón para aceptar la invitación y crear tu cuenta:</Text>
    <Button className="dm-btn" style={styles.button} href={confirmationUrl}>
      Aceptar invitación
    </Button>
    <Text style={styles.note}>
      Si no esperabas esta invitación, puedes ignorar este correo con tranquilidad.
    </Text>
  </EmailShell>
)

export default InviteEmail
