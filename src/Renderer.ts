import Registry from './Registry';
import MetricFamilySamples from './MetricFamilySamples';
import Sample from './Sample';
import array_combine from './Util/array_combine';

export default class Renderer {
    public static MIME_TYPE = 'text/plain; version=0.1.0';

    public static async render(registry: Registry): Promise<string> {
        const metrics = await registry.getMetricFamilySamples();

        metrics.sort((a, b) => a.name.localeCompare(b.name));
        const lines = [];
        for (const metric of metrics) {
            lines.push(
                `# HELP ${metric.name} ${metric.help}`,
                `# TYPE ${metric.name} ${metric.type}`,
                ...metric.samples.map((sample) => Renderer.renderSample(metric, sample)),
            );
        }

        return lines.join('\n') + '\n';
    }

    private static renderSample(metric: MetricFamilySamples, sample: Sample): string {
        const escapedLabels = [];
        const labelNames    = metric.labelNames;
        if (metric.hasLabelNames() || sample.hasLabelNames()) {
            const labels = array_combine(labelNames.concat(sample.labelNames), sample.labelValues);
            for (const [labelName, labelValue] of Object.entries(labels)) {
                escapedLabels.push(`${labelName}="${Renderer.escapeLabelValue(labelValue)}"`);
            }

            return `${sample.name}{${escapedLabels.join(',')}} ${sample.value}`;
        }

        return sample.name + ' ' + sample.value;
    }

    private static escapeLabelValue(value: string): string {
        return value
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/"/g, '\\"');
    }
}
