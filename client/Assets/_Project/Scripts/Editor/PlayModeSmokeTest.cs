using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Harvesto.EditorTools
{
    /// <summary>
    /// Headless runtime smoke test: enters Play mode on SampleScene, lets
    /// GameBootstrap/FarmGridView run for a few seconds against the live
    /// backend, then exits. Not a substitute for a human actually pressing
    /// Play — this only proves nothing throws and the network calls land.
    /// Invoke via: -executeMethod Harvesto.EditorTools.PlayModeSmokeTest.Run
    /// (no -quit — this script calls EditorApplication.Exit itself).
    /// </summary>
    public static class PlayModeSmokeTest
    {
        private const string SampleScenePath = "Assets/Scenes/SampleScene.unity";
        private const float PlaySecondsAfterEnteringPlayMode = 8f;
        private const float HardTimeoutSeconds = 30f;

        private static double _startTime;
        private static bool _hasEnteredPlay;

        public static void Run()
        {
            EditorSceneManager.OpenScene(SampleScenePath, OpenSceneMode.Single);
            _startTime = EditorApplication.timeSinceStartup;
            _hasEnteredPlay = false;
            EditorApplication.update += OnUpdate;
            EditorApplication.isPlaying = true;
        }

        private static void OnUpdate()
        {
            if (EditorApplication.isPlaying)
            {
                _hasEnteredPlay = true;
            }

            var elapsed = EditorApplication.timeSinceStartup - _startTime;
            var doneWaiting = _hasEnteredPlay && elapsed > PlaySecondsAfterEnteringPlayMode;
            var timedOut = elapsed > HardTimeoutSeconds;

            if (doneWaiting || timedOut)
            {
                EditorApplication.update -= OnUpdate;
                if (timedOut && !_hasEnteredPlay)
                {
                    Debug.LogError("[Harvesto] PlayModeSmokeTest timed out before entering Play mode.");
                }
                Debug.Log("[Harvesto] PlayModeSmokeTest complete, exiting.");
                EditorApplication.isPlaying = false;
                EditorApplication.Exit(0);
            }
        }
    }
}
