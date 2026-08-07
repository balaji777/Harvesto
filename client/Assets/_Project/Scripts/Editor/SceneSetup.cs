using Harvesto.Core;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Harvesto.EditorTools
{
    /// <summary>
    /// One-time scene wiring, also runnable headlessly via
    /// `-executeMethod Harvesto.EditorTools.SceneSetup.AddBootstrapToSampleScene`
    /// so CI/setup scripts don't depend on manual Editor clicks.
    /// </summary>
    public static class SceneSetup
    {
        private const string SampleScenePath = "Assets/Scenes/SampleScene.unity";

        [MenuItem("Harvesto/Add GameBootstrap To Sample Scene")]
        public static void AddBootstrapToSampleScene()
        {
            var scene = EditorSceneManager.OpenScene(SampleScenePath, OpenSceneMode.Single);

            if (Object.FindFirstObjectByType<GameBootstrap>() == null)
            {
                var go = new GameObject("GameBootstrap");
                go.AddComponent<GameBootstrap>();
                Undo.RegisterCreatedObjectUndo(go, "Add GameBootstrap");
                Debug.Log("[Harvesto] Added GameBootstrap to SampleScene.");
            }
            else
            {
                Debug.Log("[Harvesto] GameBootstrap already present in SampleScene.");
            }

            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);
        }
    }
}
