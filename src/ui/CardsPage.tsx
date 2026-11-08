import { CARD_LIST, ESSENCE_INFO, TIER_INFO } from '../games/alchemy/data';
import { EssenceIcon } from '../games/alchemy/ui/icons';
import { RecipeCard } from '../games/alchemy/ui/parts';
import { ESSENCES, TIERS } from '../games/alchemy/types';
import { navigate } from './router';

/** 전체 카드 90장을 분야 · 단계별로 보여주는 도감 */
export function CardsPage() {
  return (
    <div className="rules cards-page">
      <header className="lobby-head">
        <button className="btn btn-ghost btn-small" onClick={() => navigate('/rules')}>
          ← 규칙
        </button>
        <h1>카드 도감</h1>
        <span />
      </header>
      {ESSENCES.map((e) => (
        <section key={e} className="panel">
          <h2 className="gallery-title">
            <span className={`token token-sm ess-${e}`}>
              <EssenceIcon color={e} size={13} />
            </span>
            {ESSENCE_INFO[e].name}
          </h2>
          {TIERS.map((t) => (
            <div key={t} className="gallery-tier">
              <p className="hint">{TIER_INFO[t].name}</p>
              <div className="gallery-row">
                {CARD_LIST.filter((c) => c.essence === e && c.tier === t).map((c) => (
                  <RecipeCard key={c.id} card={c} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
