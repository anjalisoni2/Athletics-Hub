# serializers.py
from rest_framework import serializers
from .models import Event

class ApprovedEventSerializer(serializers.ModelSerializer):
    imageUrl = serializers.SerializerMethodField()
    title = serializers.CharField(source='name', read_only=True)
    date = serializers.DateField(source='start_date', read_only=True)
    price = serializers.DecimalField(source='fee', read_only=True, max_digits=8, decimal_places=2)

    class Meta:
        model = Event
        fields = [
            'id',
            'title',
            'description',
            'date',
            'location',
            'imageUrl',
            'price',
            'distance',
            'category',
        ]

    def get_imageUrl(self, obj):
        if obj.image and hasattr(obj.image, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return f"https://athleticseventbackend-production.up.railway.app{obj.image.url}"
        return "https://placehold.co/600x400?text=No+Image"

        
class EventSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = '__all__'

    def get_image(self, obj):
        if obj.image and hasattr(obj.image, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return f"https://athleticseventbackend-production.up.railway.app{obj.image.url}"
        return None



from rest_framework import serializers
from .models import Volunteer

class VolunteerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Volunteer
        fields = "__all__"
