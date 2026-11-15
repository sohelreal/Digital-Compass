package com.digitalcompass.app;

import android.content.Context;
import android.hardware.GeomagneticField;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Fast, tilt-compensated compass using the Android fused ROTATION_VECTOR sensor (~50 Hz),
 * with true-north correction (magnetic declination) and interference / calibration info.
 */
@CapacitorPlugin(name = "Compass")
public class CompassPlugin extends Plugin implements SensorEventListener {
    private SensorManager sm;
    private Sensor rot, mag;
    private boolean running = false;
    private float declination = 0f;
    private boolean hasDecl = false;
    private float fieldUt = 0f;
    private int magAcc = 0;
    private final float[] R = new float[9];

    @PluginMethod
    public void start(PluginCall call) {
        sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        rot = sm.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        mag = sm.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
        if (rot == null) {
            call.reject("No rotation vector sensor on this device");
            return;
        }
        register();
        running = true;
        JSObject ret = new JSObject();
        ret.put("started", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        running = false;
        if (sm != null) sm.unregisterListener(this);
        call.resolve();
    }

    @PluginMethod
    public void setLocation(PluginCall call) {
        double lat = call.getDouble("lat", 0.0);
        double lon = call.getDouble("lon", 0.0);
        double alt = call.getDouble("alt", 0.0);
        GeomagneticField g = new GeomagneticField((float) lat, (float) lon, (float) alt, System.currentTimeMillis());
        declination = g.getDeclination();
        hasDecl = true;
        JSObject ret = new JSObject();
        ret.put("declination", (double) declination);
        call.resolve(ret);
    }

    private void register() {
        sm.registerListener(this, rot, 20000); // 20 ms = ~50 Hz
        if (mag != null) sm.registerListener(this, mag, SensorManager.SENSOR_DELAY_NORMAL);
    }

    @Override
    protected void handleOnPause() {
        if (running && sm != null) sm.unregisterListener(this);
        super.handleOnPause();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (running && sm != null) register();
    }

    @Override
    public void onSensorChanged(SensorEvent e) {
        int type = e.sensor.getType();
        if (type == Sensor.TYPE_MAGNETIC_FIELD) {
            float x = e.values[0], y = e.values[1], z = e.values[2];
            fieldUt = (float) Math.sqrt(x * x + y * y + z * z);
            return;
        }
        if (type != Sensor.TYPE_ROTATION_VECTOR) return;

        SensorManager.getRotationMatrixFromVector(R, e.values);
        // Horizontal projection of device-top + device-back axes => works flat, tilted or upright.
        double h = Math.toDegrees(Math.atan2(R[1] - R[2], R[4] - R[5]));
        h = (h + 360.0) % 360.0;

        double accDeg = -1.0;
        if (e.values.length >= 5 && e.values[4] >= 0) accDeg = Math.toDegrees(e.values[4]);

        JSObject o = new JSObject();
        o.put("magnetic", h);
        o.put("trueHeading", (h + declination + 720.0) % 360.0);
        o.put("declination", (double) declination);
        o.put("hasDeclination", hasDecl);
        o.put("accuracy", accDeg);
        o.put("field", (double) fieldUt);
        o.put("calibration", magAcc);
        notifyListeners("heading", o);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        if (sensor.getType() == Sensor.TYPE_MAGNETIC_FIELD) magAcc = accuracy;
    }
}
