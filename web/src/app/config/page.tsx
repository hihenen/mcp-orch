'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  FileJson,
  Code,
  Settings
} from 'lucide-react';
import { api } from '@/lib/api';
import { AppLayout } from '@/components/layout/AppLayout';

interface ConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export default function ConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [originalConfig, setOriginalConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [validation, setValidation] = useState<ConfigValidation | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('editor');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await api.getConfig();
      setConfig(JSON.stringify(data, null, 2));
      setOriginalConfig(JSON.stringify(data, null, 2));
      setJsonError(null);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  const validateJson = (jsonString: string) => {
    try {
      JSON.parse(jsonString);
      setJsonError(null);
      return true;
    } catch (error: any) {
      setJsonError(error.message);
      return false;
    }
  };

  const handleConfigChange = (value: string) => {
    setConfig(value);
    validateJson(value);
  };

  const validateConfig = async () => {
    if (!validateJson(config)) {
      return;
    }

    try {
      const configObj = JSON.parse(config);
      const result = await api.validateConfig(configObj);
      setValidation(result);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to validate configuration' });
    }
  };

  const saveConfig = async () => {
    if (!validateJson(config)) {
      setMessage({ type: 'error', text: 'Invalid JSON format' });
      return;
    }

    try {
      setSaving(true);
      const configObj = JSON.parse(config);
      await api.updateConfig(configObj);
      setOriginalConfig(config);
      setMessage({ type: 'success', text: 'Configuration saved successfully' });
      
      // Validate after saving
      await validateConfig();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const reloadConfig = async () => {
    try {
      setReloading(true);
      const result = await api.reloadConfig();
      setMessage({ type: 'success', text: result.message });
      
      // Reload the config after successful reload
      await loadConfig();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reload configuration' });
    } finally {
      setReloading(false);
    }
  };

  const resetConfig = () => {
    setConfig(originalConfig);
    setJsonError(null);
    setValidation(null);
    setMessage(null);
  };

  const hasChanges = config !== originalConfig;

  const renderJsonEditor = () => (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={config || ''}
          onChange={(e) => handleConfigChange(e.target.value)}
          className={`w-full h-[500px] p-4 font-mono text-sm border rounded-lg bg-gray-50 dark:bg-gray-900 ${
            jsonError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          spellCheck={false}
        />
        {jsonError && (
          <div className="absolute bottom-2 left-2 right-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 p-2 rounded text-sm">
            JSON Error: {jsonError}
          </div>
        )}
      </div>

      {validation && (
        <div className="space-y-2">
          {validation.errors.length > 0 && (
            <Alert className="border-red-500">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Validation Errors:</div>
                <ul className="list-disc list-inside space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validation.warnings.length > 0 && (
            <Alert className="border-yellow-500">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Warnings:</div>
                <ul className="list-disc list-inside space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validation.valid && validation.errors.length === 0 && (
            <Alert className="border-green-500">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Configuration is valid</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );

  const renderFormEditor = () => {
    if (!config) return null;

    try {
      const configObj = JSON.parse(config);
      
      return (
        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Form-based editor is coming soon. Please use the JSON editor for now.
            </AlertDescription>
          </Alert>

          {/* Preview of current configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Servers</h3>
            {configObj.servers && Object.entries(configObj.servers).map(([name, server]: [string, any]) => (
              <Card key={name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{name}</CardTitle>
                    <Badge variant="outline">{server.command}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {server.args && <div>Args: {server.args.join(' ')}</div>}
                    {server.env && <div>Environment variables: {Object.keys(server.env).length}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    } catch (error) {
      return (
        <Alert className="border-red-500">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid JSON format. Please fix errors in the JSON editor first.
          </AlertDescription>
        </Alert>
      );
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Configuration</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage MCP server configuration
        </p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>MCP Configuration</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-yellow-600">
                  Unsaved changes
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={resetConfig}
                disabled={!hasChanges}
              >
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={validateConfig}
                disabled={!config || !!jsonError}
              >
                Validate
              </Button>
              <Button
                size="sm"
                onClick={saveConfig}
                disabled={!hasChanges || !!jsonError || saving}
              >
                {saving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={reloadConfig}
                disabled={reloading}
              >
                {reloading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Reloading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload Servers
                  </>
                )}
              </Button>
            </div>
          </div>
          <CardDescription>
            Edit the configuration file to add, modify, or remove MCP servers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                JSON Editor
              </TabsTrigger>
              <TabsTrigger value="form" className="flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                Form Editor
              </TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="mt-4">
              {renderJsonEditor()}
            </TabsContent>
            <TabsContent value="form" className="mt-4">
              {renderFormEditor()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        <p>
          <strong>Note:</strong> Changes to the configuration will require a server reload to take effect.
          Use the "Reload Servers" button after saving to apply your changes.
        </p>
        </div>
      </div>
    </AppLayout>
  );
}
