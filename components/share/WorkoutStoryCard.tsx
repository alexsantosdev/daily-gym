import styles from "@/components/share/WorkoutStoryCard.module.css"
import type { WorkoutShareCardData } from "@/types/workoutShare"

function splitHeadline(headline: string) {
  const words = headline.trim().split(/\s+/)

  if (words.length <= 1) {
    return { start: words[0] ?? headline, end: "" }
  }

  const end = words[words.length - 1]
  const start = words.slice(0, -1).join(" ")
  return { start, end }
}

function getBestHashtag(data: WorkoutShareCardData) {
  if (data.cardType === "competition") {
    return "#placardasemana"
  }

  if (data.cardType === "streak") {
    return "#ofensivaativa"
  }

  if (data.cardType === "activity") {
    return "#movimentoconta"
  }

  if (data.cardType === "monthly_recap") {
    return "#evolucao"
  }

  return "#treinofeito"
}

export function WorkoutStoryCard({ data, className }: { data: WorkoutShareCardData; className?: string }) {
  const split = splitHeadline(data.headline)
  const cardType = data.cardType
  const isStreak = cardType === "streak"
  const isCompetition = cardType === "competition"
  const isActivity = cardType === "activity"
  const isRecap = cardType === "monthly_recap"

  const badgeClass =
    cardType === "competition"
      ? styles.badgeCompetition
      : cardType === "streak"
        ? styles.badgeStreak
        : cardType === "activity"
          ? styles.badgeActivity
          : isRecap
            ? styles.badgeRecap
            : styles.badgeWorkout

  const metricThreeLabel = isCompetition ? "Pontos" : isStreak ? "Ofensiva" : isActivity ? "Movimento" : "Calorias"
  const metricThreeValue = isCompetition
    ? data.completedExercises
    : isStreak
      ? `${data.currentStreak ?? 0}d`
      : isActivity
        ? "ATIVO"
        : `~${data.estimatedCalories}`

  return (
    <div className={`${styles["story-card"]} ${className ?? ""}`.trim()}>
      <div className={styles.content}>
        <header className={styles.top}>
          <p className={styles.brand}>DAILY-GYM</p>
          <span className={`${styles.badge} ${badgeClass}`}>{data.badgeLabel}</span>
        </header>

        <main className={styles.main}>
          <section className={styles.hero}>
            <p className={styles.kicker}>{data.kicker}</p>
            <h2 className={styles.headline}>
              {split.start}
              {split.end ? (
                <>
                  {" "}
                  <span className={styles.headlineAccent}>{split.end}</span>
                </>
              ) : null}
            </h2>
            <p className={styles.subtitle}>{data.subtitle}</p>
          </section>

          <section className={styles.trainBlock}>
            <p className={styles.workoutName}>{data.workoutName}</p>
            <p className={styles.goal}>
              {data.planName ? `${data.planName} • ` : ""}
              {data.goalLabel || "Disciplina em progresso"}
            </p>
            <p className={styles.highlight}>{data.performanceHighlight}</p>
          </section>

          <section className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Duracao</span>
              <span className={styles.metricValue}>{data.durationMinutes} min</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Exercicios</span>
              <span className={styles.metricValue}>
                {data.completedExercises}/{data.totalExercises}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>{metricThreeLabel}</span>
              <span className={styles.metricValue}>{metricThreeValue}</span>
            </div>
          </section>

          {typeof data.currentStreak === "number" ? (
            <section className={`${styles.streak} ${data.currentStreak > 0 ? "" : styles.streakNeutral}`.trim()}>
              {data.currentStreak > 0 ? `🔥 ${data.currentStreak} dias de ofensiva` : "🔥 Sequencia pronta para comecar"}
            </section>
          ) : null}

          {isCompetition ? (
            <section className={styles.challengeBlock}>
              <p className={styles.challengeTitle}>Confronto da semana</p>
              <p className={styles.challengeValue}>{data.performanceHighlight}</p>
            </section>
          ) : null}

          <section className={styles.emotion}>
            <p className={styles.motivation}>“{data.motivationalPhrase}”</p>
            <p className={styles.socialHook}>{data.socialHook}</p>
          </section>
        </main>

        <footer className={styles.footer}>
          <span>{data.date}</span>
          <span className={styles.meta}>{getBestHashtag(data)}</span>
        </footer>
      </div>
    </div>
  )
}
