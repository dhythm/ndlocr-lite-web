type Props = {
  t: Record<string, Record<string, string>>
}

export function Footer({ t }: Props) {
  return (
    <footer className="footer">
      <p>{t.footer.attribution}</p>
      <p>{t.footer.privacy}</p>
    </footer>
  )
}
