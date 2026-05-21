import Link from "next/link"
import { Sparkles } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Условия использования · Entrium AI",
  description: "Условия пользования платформой Entrium AI.",
}

export default function TermsPage() {
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>Entrium AI</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-12 lg:py-20">
        <h1 className="text-3xl font-semibold tracking-tight">Условия использования</h1>
        <p className="mt-2 text-sm text-muted-foreground">Последнее обновление: 7 мая 2026</p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">1. Принятие условий</h2>
            <p>
              Используя Entrium AI, вы соглашаетесь с этими условиями. Если не согласны — не используйте сервис.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">2. Что мы предоставляем</h2>
            <p>
              Entrium AI — образовательная платформа с AI-инструментами для подготовки к поступлению в зарубежные университеты: диагностика профиля, анализ шансов, подбор университетов и стипендий, помощь с эссе, симулятор интервью.
            </p>
            <p className="mt-3">
              <strong>Важно:</strong> AI-ответы носят рекомендательный характер. Финальные решения о поступлении, выборе университета и подаче документов принимаете вы. Мы не гарантируем поступление.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">3. Аккаунт</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Вы должны быть старше 16 лет (или иметь согласие родителей).</li>
              <li>Один человек — один аккаунт. Не передавайте доступ.</li>
              <li>Вы отвечаете за безопасность пароля и активность аккаунта.</li>
              <li>Не используйте сервис для незаконных целей или нарушения прав третьих лиц.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">4. Тарифы</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Free:</strong> 5 AI-запросов в день, движок Entrium AI.</li>
              <li><strong>Pro:</strong> безлимитные запросы, Entrium AI Pro, расширенные функции.</li>
              <li>Бонус: +10 запросов за каждого приглашённого друга.</li>
            </ul>
            <p className="mt-3">Цены и условия Pro могут меняться с уведомлением за 30 дней.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">5. Запрещённое использование</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Автоматизация запросов (боты, скрипты, скрейпинг).</li>
              <li>Попытки обойти лимиты или платные функции.</li>
              <li>Создание контента для обмана приёмных комиссий (выдача чужих эссе за свои).</li>
              <li>Запросы с целью вредоносного использования AI.</li>
            </ul>
            <p className="mt-3">Нарушения → блокировка аккаунта без возврата средств.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">6. Интеллектуальная собственность</h2>
            <p>
              Контент, созданный AI по вашим запросам, принадлежит вам. Платформа, дизайн, код, база данных университетов — наши. QS World Rankings — собственность QS Quacquarelli Symonds.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">7. Отказ от гарантий</h2>
            <p>
              Сервис предоставляется «как есть». AI может ошибаться. Информация о университетах и стипендиях обновляется периодически — проверяйте актуальные данные на официальных сайтах перед подачей документов.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">8. Ограничение ответственности</h2>
            <p>
              Мы не несём ответственности за: упущенную выгоду, отказ в поступлении, неверные решения на основе AI-рекомендаций, простои сервиса. Максимальная ответственность — сумма, уплаченная вами за последние 12 месяцев.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">9. Изменения и прекращение</h2>
            <p>
              Мы можем менять условия, уведомив вас за 14 дней. Можем прекратить сервис с уведомлением за 30 дней — данные можно будет экспортировать.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">10. Контакты</h2>
            <p>
              Вопросы и претензии: <a href="mailto:tursunbaev505@gmail.com" className="underline">tursunbaev505@gmail.com</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/40 py-8 mt-20">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <p>© 2026 Entrium AI</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
