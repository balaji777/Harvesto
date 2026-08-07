using UnityEngine;
using UnityEngine.UI;

namespace Harvesto.UI
{
    /// <summary>
    /// Minimal on-screen status readout (wallet + silo + last action).
    /// Built entirely at runtime with the built-in legacy font so it needs
    /// no imported art/font assets — this is placeholder UI, not final art.
    /// </summary>
    public class FarmHud : MonoBehaviour
    {
        private Text _statusText;

        private void Awake()
        {
            var canvasGo = new GameObject("HudCanvas");
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGo.AddComponent<CanvasScaler>();
            canvasGo.AddComponent<GraphicRaycaster>();

            var textGo = new GameObject("StatusText");
            textGo.transform.SetParent(canvasGo.transform, false);
            _statusText = textGo.AddComponent<Text>();
            _statusText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            _statusText.fontSize = 22;
            _statusText.color = Color.white;
            _statusText.alignment = TextAnchor.UpperLeft;
            _statusText.horizontalOverflow = HorizontalWrapMode.Overflow;
            _statusText.verticalOverflow = VerticalWrapMode.Overflow;

            var rect = _statusText.rectTransform;
            rect.anchorMin = new Vector2(0, 1);
            rect.anchorMax = new Vector2(0, 1);
            rect.pivot = new Vector2(0, 1);
            rect.anchoredPosition = new Vector2(16, -16);
            rect.sizeDelta = new Vector2(700, 200);
        }

        public void SetStatus(string text)
        {
            _statusText.text = text;
        }
    }
}
